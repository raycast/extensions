import { stat, readFile, writeFile, copyFile } from "fs/promises";
import { getPreferenceValues, environment, showToast, Toast } from "@raycast/api";
import * as utils from "./utils";
import { existsSync, readFileSync } from "fs";
import Fuse from "fuse.js";
import initSqlJs from "sql.js";
import path = require("path");

export interface Preferences {
  zotero_path: string;
  use_bibtex?: boolean;
  bibtex_path?: string;
  csl_style?: string;
  cache_period?: string;
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
  collection?: string[];
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
SELECT citationkey.citationKey AS citekey
    FROM citationkey
WHERE citationkey.itemKey = :key
AND citationkey.libraryID = :lib
`;

const BIBTEX_SQL_OLD = `
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

const CREATORS_SQL = `
SELECT  creators.firstName AS given,
        creators.lastName AS family,
        itemCreators.orderIndex AS "index",
        creatorTypes.creatorType AS "type"
    FROM creators
    LEFT JOIN itemCreators
        ON creators.creatorID = itemCreators.creatorID
    LEFT JOIN creatorTypes
        ON itemCreators.creatorTypeID = creatorTypes.creatorTypeID
WHERE itemCreators.itemID = :id
ORDER BY "index" ASC
`;

const ALL_COLLECTIONS_SQL = `
SELECT  collections.collectionName AS name
    FROM collections
`;

const COLLECTIONS_SQL = `
SELECT  collections.collectionName AS name,
        collections.key AS key
    FROM collections
    LEFT JOIN collectionItems
        ON collections.collectionID = collectionItems.collectionID
WHERE collectionItems.itemID = :id
`;

const cachePath = utils.cachePath("zotero.json");

export function resolveHome(filepath: string): string {
  if (filepath[0] === "~") {
    return path.join(process.env.HOME, filepath.slice(1));
  }
  return filepath;
}

async function openDb() {
  const preferences: Preferences = getPreferenceValues();
  const f_path = resolveHome(preferences.zotero_path);
  const new_fPath = f_path + ".raycast";
  await copyFile(f_path, new_fPath);

  const wasmBinary = readFileSync(path.join(environment.assetsPath, "sql-wasm.wasm"));
  const SQL = await initSqlJs({ wasmBinary });
  const db = readFileSync(new_fPath);
  return new SQL.Database(db);
}

async function getBibtexKey(key: string, library: string): Promise<string> {
  const [db, isBBTUpdated] = await openBibtexDb();
  const st = db.prepare(isBBTUpdated ? BIBTEX_SQL : BIBTEX_SQL_OLD);
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
  let new_fPath = f_path.replace("zotero.sqlite", "better-bibtex.sqlite");
  let isBBTUpdated = true;
  if (!existsSync(new_fPath)) {
    new_fPath = f_path.replace("zotero.sqlite", "better-bibtex-search.sqlite");
    isBBTUpdated = false;
  }

  const wasmBinary = readFileSync(path.join(environment.assetsPath, "sql-wasm.wasm"));
  const SQL = await initSqlJs({ wasmBinary });
  const db = readFileSync(new_fPath);
  return [new SQL.Database(db), isBBTUpdated];
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

export const getCollections = async (): Promise<string[]> => {
  const db = await openDb();
  const st = db.prepare(ALL_COLLECTIONS_SQL);
  const cols = [];
  while (st.step()) {
    cols.push(st.getAsObject().name);
  }
  return cols;
};

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
    if (v.length > 0) {
      row.tags = v;
    }

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

    const st5 = db.prepare(CREATORS_SQL);
    st5.bind({ ":id": row.id });

    const cts = [];
    while (st5.step()) {
      const temp_data = st5.getAsObject();
      cts.push(`${temp_data.given} ${temp_data.family}`);
    }
    st5.free();

    if (cts.length > 0) {
      row.creators = cts;
    }

    const st6 = db.prepare(COLLECTIONS_SQL);
    st6.bind({ ":id": row.id });

    const clt = [];
    while (st6.step()) {
      clt.push(st6.getAsObject().name);
    }

    st6.free();

    if (clt.length > 0) {
      row.collection = clt;
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
  if (qs.length > 0) {
    qss = qs.join(" ");
  }

  let tss = [];
  if (ts.length > 0) {
    tss = ts.map((x) => x.substring(1));
  }

  return { qss, tss };
};

export const searchResources = async (q: string): Promise<RefData[]> => {
  const preferences: Preferences = getPreferenceValues();

  async function updateCache(): Promise<RefData[]> {
    const data = await getData();
    const fData = {
      zotero_path: preferences.zotero_path,
      use_bibtex: preferences.use_bibtex,
      data: data,
    };
    try {
      await writeFile(cachePath, JSON.stringify(fData));
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

    if (diffTime < 60000 * Number(preferences.cache_period)) {
      const latest = await getLatestModifyDate();
      if (latest < cacheTime) {
        const cacheBuffer = await readFile(cachePath);
        const fData = JSON.parse(cacheBuffer.toString());
        if (fData.zotero_path === preferences.zotero_path && fData.use_bibtex === preferences.use_bibtex) {
          return fData.data;
        } else {
          throw "Invalid cache";
        }
      } else {
        throw "Invalid cache";
      }
    } else {
      throw "Invalid cache";
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

  if (!qss.trim() && tss.length < 1) {
    return ret;
  }

  const options = {
    isCaseSensitive: false,
    includeScore: false,
    shouldSort: true,
    includeMatches: false,
    findAllMatches: true,
    minMatchCharLength: 3,
    threshold: 0.1,
    ignoreLocation: true,
    keys: [
      {
        name: "title",
        weight: 10,
      },
      {
        name: "abstractNote",
        weight: 5,
      },
      {
        name: "tags",
        weight: 15,
      },
      {
        name: "date",
        weight: 3,
      },
      {
        name: "creators",
        weight: 4,
      },
      {
        name: "DOI",
        weight: 10,
      },
    ],
  };

  const query: Fuse.Expression = {
    $and: qss
      .split(" ")
      .map((k) => k.trim())
      .filter(Boolean)
      .map((z) => ({
        $or: options.keys.map((x) => Object.fromEntries(new Map([[x.name, z.replace(/\+/gi, " ")]]))),
      })),
  };

  if (tss.length > 0) {
    query["$and"].push({ $and: tss.map((x) => ({ tags: x.replace(/\+/gi, " ") })) });
  }

  return new Fuse(ret, options).search(query).map((x) => x.item);
};
