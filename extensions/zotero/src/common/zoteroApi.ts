import { stat, readFile, writeFile, copyFile } from "fs/promises";
import { getPreferenceValues, environment} from "@raycast/api";
import * as utils from "./utils";
import { readFileSync } from "fs";
import initSqlJs from "sql.js";

const path = require('path');

interface Preferences {
  zotero_path: string;
}

export interface RefData {
  id: Number;
  added: Date;
  modified: Date;
  key: string;
  library: Number;
  type:string;
  tags?: string[];
  attachment?: Attachment;
  [key: string]: any;
}

export interface Attachment {
  key: string;
  path: string;
  title: string;
  url: string;
}

const ITEMS_SQL = `
SELECT  items.itemID AS id,
        items.dateAdded AS added,
        items.dateModified AS modified,
        items.key AS key,
        items.libraryID AS library,
        itemTypes.typeName AS type
    FROM items
    LEFT JOIN itemTypes
        ON items.itemTypeID = itemTypes.itemTypeID
    LEFT JOIN deletedItems
        ON items.itemID = deletedItems.itemID
-- Ignore notes and attachments
WHERE items.itemTypeID not IN (1, 2, 3, 4, 5, 11, 12, 13, 14, 15, 16, 24, 25, 26, 27, 36, 37)
AND deletedItems.dateDeleted IS NULL
`;

const TAGS_SQL = `
SELECT tags.name AS name
    FROM tags
    LEFT JOIN itemTags
        ON tags.tagID = itemTags.tagID
WHERE itemTags.itemID = :id
`;

const METADATA_SQL = `
SELECT  fields.fieldName AS name,
        itemDataValues.value AS value
    FROM itemData
    LEFT JOIN fields
        ON itemData.fieldID = fields.fieldID
    LEFT JOIN itemDataValues
        ON itemData.valueID = itemDataValues.valueID
WHERE itemData.itemID = :id
`;

const ATTACHMENTS_SQL = `
SELECT
    items.key AS key,
    itemAttachments.path AS path,
    (SELECT  itemDataValues.value
        FROM itemData
        LEFT JOIN fields
            ON itemData.fieldID = fields.fieldID
        LEFT JOIN itemDataValues
            ON itemData.valueID = itemDataValues.valueID
    WHERE itemData.itemID = items.itemID AND fields.fieldName = 'title')
    title,
    (SELECT  itemDataValues.value
        FROM itemData
        LEFT JOIN fields
            ON itemData.fieldID = fields.fieldID
        LEFT JOIN itemDataValues
            ON itemData.valueID = itemDataValues.valueID
    WHERE itemData.itemID = items.itemID AND fields.fieldName = 'url')
    url
FROM itemAttachments
    LEFT JOIN items
        ON itemAttachments.itemID = items.itemID
WHERE itemAttachments.parentItemID = :id
AND itemAttachments.contentType = 'application/pdf'
`
const cachePath = utils.cachePath('zotero.json');

function resolveHome(filepath: string) : string{
  if (filepath[0] === '~') {
      return path.join(process.env.HOME, filepath.slice(1));
  }
  return filepath;
}

async function openDb () {
  const preferences: Preferences = getPreferenceValues();
  let f_path = resolveHome(preferences.zotero_path);
  let new_fPath = f_path + '.raycast'

  const SQL = await initSqlJs({ locateFile: () => path.join(environment.assetsPath, "sql-wasm.wasm") });
  const db = readFileSync(new_fPath);
  return new SQL.Database(db);
}

async function getLatestModifyDate(): Promise<Date> {
  const db = await openDb();
  let statement = db.prepare(ITEMS_SQL);

  var results = [];
  while (statement.step()) {
    results.push(statement.getAsObject());
  }

  statement.free();

  let latest = new Date(results[0].modified);
  for (const row of results) {
    let d = new Date(row.modified);
    if (d > latest){
      latest = d;
    }
  }

  db.close();
  return latest;
}

async function getData(): Promise<RefData[]> {
  const db = await openDb();

  let st1 = db.prepare(ITEMS_SQL);

  var rows = [];
  while (st1.step()) {
    let row = st1.getAsObject();
    const st2 = db.prepare(TAGS_SQL);
    st2.bind({":id": row.id});

    var v = [];
    while (st2.step()) {
      v.push(st2.getAsObject().name)
    }
    st2.free();
    row.tags = v;


    const st3 = db.prepare(METADATA_SQL);
    st3.bind({":id": row.id});

    var mds = [];
    while (st3.step()) {
      mds.push(st3.getAsObject())
    }
    st3.free();

    if(mds)
    {
      for (const md of mds) {
        row[md.name] = md.value;
      }
    }

    const st4 = db.prepare(ATTACHMENTS_SQL);
    st4.bind({":id": row.id});

    st4.step();
    var at = st4.getAsObject();
    st4.free();

    if (at) {
    row.attachment = at;
    }
    rows.push(row);
  }

  st1.free();
  db.close();

  return rows;
}

export const searchResources = async (q: string): Promise<RefData[]> => {

  const preferences: Preferences = getPreferenceValues();
  let f_path = resolveHome(preferences.zotero_path);
  let new_fPath = f_path + '.raycast'
  await copyFile(f_path, new_fPath);

  async function updateCache(): Promise<RefData[]> {
    const data = await getData();
    try {
      await writeFile(cachePath, JSON.stringify(data));
    } catch (err) {
      console.error("Failed to write installed cache:", err)
    }
    return data
  }

  async function mtime(path: string): Promise<Date> {
    return (await stat(path)).mtime;
  }

  async function readCache(): Promise<RefData[]> {
    const cacheTime = await mtime(cachePath);
    var now = new Date();
    const diffTime = Math.abs(now.getTime() - cacheTime.getTime());

    if (diffTime < 3600000){
      const cacheBuffer = await readFile(cachePath);
      const data = JSON.parse(cacheBuffer.toString());
      return data
    } else {
      const latest =  await getLatestModifyDate();
      if (latest < cacheTime){
        const cacheBuffer = await readFile(cachePath);
        const data = JSON.parse(cacheBuffer.toString());
        return data
      }
      else {
        throw 'Invalid cache';
      }
    }
  }

  let ret;
  try {
    ret = await readCache();
  } catch {
    ret = await updateCache();
  }

  ret.sort(function(a, b){return +new Date(b.added) - +new Date(a.added)});

  if (q) {
    return ret.filter(function (e) {
        return e.title?.toLowerCase().includes(q.toLowerCase()) || e.tags?.includes(q);
    })
    .sort(function(a, b){return +new Date(b.added) - +new Date(a.added)});
  }
  else {
      return ret;
  }

};
