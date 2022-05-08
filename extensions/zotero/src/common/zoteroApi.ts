import { stat, readFile, writeFile, copyFile } from "fs/promises";
import { getPreferenceValues } from "@raycast/api";
import * as utils from "./utils";
import Database from "better-sqlite3";

const path = require('path');

interface Preferences {
  better_sqlite_path: string;
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
WHERE items.itemTypeID not IN (1, 2, 3, 6, 12, 13, 14, 27)
AND deletedItems.dateDeleted IS NULL
`;

const TAGS_SQL = `
SELECT tags.name AS name
    FROM tags
    LEFT JOIN itemTags
        ON tags.tagID = itemTags.tagID
WHERE itemTags.itemID = ?
`;

const METADATA_SQL = `
SELECT  fields.fieldName AS name,
        itemDataValues.value AS value
    FROM itemData
    LEFT JOIN fields
        ON itemData.fieldID = fields.fieldID
    LEFT JOIN itemDataValues
        ON itemData.valueID = itemDataValues.valueID
WHERE itemData.itemID = ?
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
WHERE itemAttachments.parentItemID = ?
AND itemAttachments.contentType = 'application/pdf'
`
const cachePath = utils.cachePath('zotero.json');

function resolveHome(filepath: string) : string{
  if (filepath[0] === '~') {
      return path.join(process.env.HOME, filepath.slice(1));
  }
  return filepath;
}

function getLatestModifyDate(): Date {
  const preferences: Preferences = getPreferenceValues();
  let f_path = resolveHome(preferences.zotero_path);
  let new_fPath = f_path + '.raycast'
  const db = new Database(new_fPath, { nativeBinding: preferences.better_sqlite_path});

  const stmt = db.prepare(ITEMS_SQL);
  let rows = stmt.all();
  let latest = new Date(rows[0].modified);
  for (const row of rows) {
    let d = new Date(row.modified);
    if (d > latest){
      latest = d;
    }
  }

  db.close();
  return latest;
}

function getData(): RefData[] {
  const preferences: Preferences = getPreferenceValues();
  let f_path = resolveHome(preferences.zotero_path);
  let new_fPath = f_path + '.raycast'
  const db = new Database(new_fPath, { nativeBinding: preferences.better_sqlite_path});

  const stmt = db.prepare(ITEMS_SQL);
  let rows = stmt.all();
  for (const row of rows) {
    const st2 = db.prepare(TAGS_SQL);
    var v = [];
    for (const c of st2.iterate(row.id)) {
      v.push(c.name)
    }
    row.tags = v;

    const st3 = db.prepare(METADATA_SQL);
    const mds = st3.all(row.id);
    if(mds)
    {
      for (const md of mds) {
        row[md.name] = md.value;
      }
    }

    const st4 = db.prepare(ATTACHMENTS_SQL);
    const at = st4.get(row.id);
    if (at) {
    row.attachment = at;
    }
  }
  db.close();
  return rows;
}

export const searchResources = async (q: string): Promise<RefData[]> => {

  const preferences: Preferences = getPreferenceValues();
  let f_path = resolveHome(preferences.zotero_path);
  let new_fPath = f_path + '.raycast'
  await copyFile(f_path, new_fPath);

  async function updateCache(): Promise<RefData[]> {
    const data = getData();
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
      const latest =  getLatestModifyDate();
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
        return e.title.toLowerCase().includes(q.toLowerCase()) || e.tags?.includes(q);
    })
    .sort(function(a, b){return +new Date(b.added) - +new Date(a.added)});
  }
  else {
      return ret;
  }

};
