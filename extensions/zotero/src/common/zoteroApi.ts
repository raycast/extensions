import { stat, readFile, writeFile, copyFile } from "fs/promises";
import { getPreferenceValues, environment, showToast, Toast } from "@raycast/api";
import * as utils from "./utils";
import { readFileSync } from "fs";
import Fuse from "fuse.js";
import initSqlJs from "sql.js";
import path = require("path");

export interface Preferences {
  zotero_path: string;
  use_bibtex?: boolean;
}

export interface RefData {
  id?: number;
  added?: Date;
  modified?: Date;
  key?: string;
  library?: number;
  type?: string;
  citekey?: string;
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

const INVALID_TYPES_SQL = `
SELECT itemTypes.itemTypeID as tid,
       itemTypes.typeName as name
    FROM itemTypes
WHERE itemTypes.typeName IN ('artwork', 'attachment', 'audioRecording', 'bill', 'computerProgram', 'dictionaryEntry', 'email', 'film', 'forumPost', 'hearing', 'instantMessage', 'interview', 'map', 'note', 'podcast', 'radioBroadcast', 'statute', 'tvBroadcast', 'videoRecording', 'annotation')
`;

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
WHERE items.itemTypeID not IN ?
AND deletedItems.dateDeleted IS NULL
`;

const TAGS_SQL = `
SELECT tags.name AS name
    FROM tags
    LEFT JOIN itemTags
        ON tags.tagID = itemTags.tagID
WHERE itemTags.itemID = :id
`;

const BIBTEX_SQL = `
SELECT citekeys.citekey AS citekey
    FROM citekeys
WHERE citekeys.itemKey = :key
AND citekeys.libraryID = :lib
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
`;

const cachePath = utils.cachePath("zotero.json");

function resolveHome(filepath: string): string {
  if (filepath[0] === "~") {
    return path.join(process.env.HOME, filepath.slice(1));
  }
  return filepath;
}

async function openDb() {
  const preferences: Preferences = getPreferenceValues();
  const f_path = resolveHome(preferences.zotero_path);
  const new_fPath = f_path + ".raycast";

  const SQL = await initSqlJs({ locateFile: () => path.join(environment.assetsPath, "sql-wasm.wasm") });
  const db = readFileSync(new_fPath);
  return new SQL.Database(db);
}

async function getBibtexKey(key: string, library: string): Promise<string> {
  const db = await openBibtexDb();
  const st = db.prepare(BIBTEX_SQL);
  st.bind({ ":key": key, ":lib": library });
  st.step();
  const res = st.getAsObject();
  st.free();
  db.close();

  if (res) {
    return res.citekey;
  } else {
    return "";
  }
}

async function openBibtexDb() {
  const preferences: Preferences = getPreferenceValues();
  const f_path = resolveHome(preferences.zotero_path);
  const new_fPath = f_path.replace("zotero.sqlite", "better-bibtex-search.sqlite");

  const SQL = await initSqlJs({ locateFile: () => path.join(environment.assetsPath, "sql-wasm.wasm") });
  const db = readFileSync(new_fPath);
  return new SQL.Database(db);
}

async function getLatestModifyDate(): Promise<Date> {
  const db = await openDb();
  const st = db.prepare(INVALID_TYPES_SQL);
  const invalid_ids = [];
  while (st.step()) {
    const row = st.getAsObject();
    invalid_ids.push(row.tid);
  }
  st.free();
  const iids = "( " + invalid_ids.join(", ") + " )";

  const statement = db.prepare(ITEMS_SQL.replace("?", iids));

  const results = [];
  while (statement.step()) {
    results.push(statement.getAsObject());
  }

  statement.free();
  db.close();

  if (results.length < 1) {
    return new Date(new Date().setFullYear(new Date().getFullYear() + 1));
  }

  let latest = new Date(results[0].modified);
  for (const row of results) {
    const d = new Date(row.modified);
    if (d > latest) {
      latest = d;
    }
  }

  return latest;
}

async function getData(): Promise<RefData[]> {
  const db = await openDb();
  const preferences: Preferences = getPreferenceValues();

  const st = db.prepare(INVALID_TYPES_SQL);
  const invalid_ids = [];
  while (st.step()) {
    const row = st.getAsObject();
    invalid_ids.push(row.tid);
  }
  st.free();
  const iids = "( " + invalid_ids.join(", ") + " )";

  const st1 = db.prepare(ITEMS_SQL.replace("?", iids));

  const rows = [];
  while (st1.step()) {
    const row = st1.getAsObject();
    const st2 = db.prepare(TAGS_SQL);
    st2.bind({ ":id": row.id });

    const v = [];
    while (st2.step()) {
      v.push(st2.getAsObject().name);
    }
    st2.free();
    row.tags = v;

    const st3 = db.prepare(METADATA_SQL);
    st3.bind({ ":id": row.id });

    const mds = [];
    while (st3.step()) {
      mds.push(st3.getAsObject());
    }
    st3.free();

    if (mds) {
      for (const md of mds) {
        row[md.name] = md.value;
      }
    }

    const st4 = db.prepare(ATTACHMENTS_SQL);
    st4.bind({ ":id": row.id });

    st4.step();
    const at = st4.getAsObject();
    st4.free();

    if (at) {
      row.attachment = at;
    }
    if (preferences.use_bibtex) {
      row.citekey = await getBibtexKey(row.key, row.library);
    }

    rows.push(row);
  }

  st1.free();
  db.close();

  return rows;
}

const parseQuery = (q: string) => {
  const queryItems = q.split(" ");
  const qs = queryItems.filter((c) => !c.startsWith("."));
  const ts = queryItems.filter((c) => c.startsWith("."));

  let qss = "";
  if (qs.length) {
    qss = qs.join(" ");
  }

  let tss = [];
  if (ts.length) {
    tss = ts.map((x) => x.substring(1));
  }

  return { qss, tss };
};

export const searchResources = async (q: string): Promise<RefData[]> => {
  const preferences: Preferences = getPreferenceValues();
  const f_path = resolveHome(preferences.zotero_path);
  const new_fPath = f_path + ".raycast";
  await copyFile(f_path, new_fPath);

  async function updateCache(): Promise<RefData[]> {
    const data = await getData();
    try {
      await writeFile(cachePath, JSON.stringify(data));
    } catch (err) {
      console.error("Failed to write installed cache:", err);
    }
    return data;
  }

  async function mtime(path: string): Promise<Date> {
    return (await stat(path)).mtime;
  }

  async function readCache(): Promise<RefData[]> {
    const cacheTime = await mtime(cachePath);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - cacheTime.getTime());

    if (diffTime < 3600000) {
      const cacheBuffer = await readFile(cachePath);
      const data = JSON.parse(cacheBuffer.toString());
      return data;
    } else {
      const latest = await getLatestModifyDate();
      if (latest < cacheTime) {
        const cacheBuffer = await readFile(cachePath);
        const data = JSON.parse(cacheBuffer.toString());
        return data;
      } else {
        throw "Invalid cache";
      }
    }
  }

  let ret = [];
  try {
    ret = await readCache();
  } catch {
    try {
      ret = await updateCache();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Corrupt sqlite db!",
        message: "Referred sqlite db appears to be corrupt or not from Zotero!",
      });
    }
  }

  if (ret.length < 1) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Data found in referred sqlite db!",
      message: "Please update preferences or fill some references to your zotero app!",
    });
    return ret;
  }

  ret.sort(function (a, b) {
    return +new Date(b.added) - +new Date(a.added);
  });

  const { qss, tss } = parseQuery(q);

  const query: Fuse.Expression = {
    $or: [{ title: qss }, { abstractNote: qss }],
  };
  // filter for ALL tags, ignoring case
  if (tss.length > 0) {
    for (const c of tss) {
      ret = ret.filter((r) => {
        return r.tags?.some((e) => {
          return e.toLowerCase() === c.toLowerCase();
        });
      });
    }
  }

  if (!qss.trim()) {
    return ret;
  }

  const options = {
    isCaseSensitive: false,
    includeScore: false,
    shouldSort: true,
    includeMatches: false,
    findAllMatches: true,
    minMatchCharLength: 3,
    threshold: 0.9,
    ignoreLocation: true,
    keys: [
      {
        name: "title",
        weight: 6,
      },
      {
        name: "abstractNote",
        weight: 4,
      },
    ],
  };

  // Create the Fuse index
  const myIndex = Fuse.createIndex(options.keys, ret);
  // initialize Fuse with the index
  const fuse = new Fuse(ret, options, myIndex);

  const re = fuse.search(query);

  return re.map((x) => x.item);
};
