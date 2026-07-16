import { stat, readFile, writeFile, copyFile } from "fs/promises";
import { getPreferenceValues, environment, showToast, Toast } from "@raycast/api";
import * as utils from "./utils";
import { existsSync, readFileSync, rmSync } from "fs";
import { execFileSync } from "child_process";
import Fuse from "fuse.js";
import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import path = require("path");

export interface Preferences {
  zotero_path: string;
  use_bibtex?: boolean;
  bibtex_path?: string;
  csl_style?: string;
  cache_period?: string;
  quote_pdf_path?: boolean;
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
  notes?: string[];
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
ORDER BY items.dateAdded ASC
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
SELECT DISTINCT collections.collectionName AS name
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

const NOTES_SQL = `
SELECT itemNotes.note AS note
  FROM itemNotes
WHERE itemNotes.parentItemID = :id
`;

const cachePath = utils.cachePath("zotero.json");
const CACHE_VERSION = 3;

export function resolveHome(filepath: string): string {
  if (filepath[0] === "~") {
    return path.join(process.env.HOME, filepath.slice(1));
  }
  return filepath;
}

function stripNoteHtml(note?: string): string {
  if (!note) {
    return "";
  }
  return note
    .replace(/<br\s*\/?>(\n)?/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Only the tables the queries above touch. A full Zotero database is dominated
// by the full-text search index (fulltextItemWords and its indexes can be
// hundreds of MB), which we never query. sql.js has to hold the entire file in
// the WASM heap, so loading the whole database blows the Raycast worker memory
// limit on large libraries ("Worker terminated due to reaching memory limit:
// JS heap out of memory"). Copying just these tables into a slim database keeps
// the in-memory footprint to a few MB. See issue #29250.
const SLIM_TABLES = [
  "itemTypes",
  "items",
  "deletedItems",
  "tags",
  "itemTags",
  "itemData",
  "fields",
  "itemDataValues",
  "itemAttachments",
  "creators",
  "itemCreators",
  "creatorTypes",
  "collections",
  "collectionItems",
  "itemNotes",
];

// CREATE TABLE ... AS SELECT copies rows but not indexes, so re-create the
// indexes the per-item queries in getData() filter/join on. Without them sql.js
// falls back to full table scans on every one of the thousands of per-item
// lookups, which is both extremely slow and (in sql.js) very memory-hungry —
// worse than the original problem.
const SLIM_INDEXES = [
  "CREATE INDEX ix_items_id ON items(itemID)",
  "CREATE INDEX ix_deletedItems_id ON deletedItems(itemID)",
  "CREATE INDEX ix_itemTags_item ON itemTags(itemID)",
  "CREATE INDEX ix_tags_id ON tags(tagID)",
  "CREATE INDEX ix_itemData_item ON itemData(itemID)",
  "CREATE INDEX ix_fields_id ON fields(fieldID)",
  "CREATE INDEX ix_itemDataValues_id ON itemDataValues(valueID)",
  "CREATE INDEX ix_itemAttachments_parent ON itemAttachments(parentItemID)",
  "CREATE INDEX ix_itemCreators_item ON itemCreators(itemID)",
  "CREATE INDEX ix_creators_id ON creators(creatorID)",
  "CREATE INDEX ix_creatorTypes_id ON creatorTypes(creatorTypeID)",
  "CREATE INDEX ix_collectionItems_item ON collectionItems(itemID)",
  "CREATE INDEX ix_collections_id ON collections(collectionID)",
  "CREATE INDEX ix_itemNotes_parent ON itemNotes(parentItemID)",
];

// Build a slim database at `slimPath` containing only SLIM_TABLES (plus the
// indexes above) copied from `sourcePath`, using the macOS system sqlite3
// binary. Returns the slim database bytes, or null if the slimming failed (e.g.
// sqlite3 missing) so the caller can fall back. Both paths are extension-owned
// (never user-controlled), so the single-quote escaping below is only
// defence-in-depth.
function buildSlimDb(sourcePath: string, slimPath: string): Buffer | null {
  try {
    const script = [
      `ATTACH '${sourcePath.replace(/'/g, "''")}' AS src;`,
      ...SLIM_TABLES.map((t) => `CREATE TABLE "${t}" AS SELECT * FROM src."${t}";`),
      ...SLIM_INDEXES.map((s) => `${s};`),
    ].join("\n");
    execFileSync("/usr/bin/sqlite3", [slimPath, script], { timeout: 30000 });
    return readFileSync(slimPath);
  } catch {
    return null;
  }
}

// Monotonic counter so overlapping openDb() calls (e.g. getData and
// getCollections during startup) never share a temp path.
let dbSeq = 0;

async function openDb() {
  const preferences: Preferences = getPreferenceValues();
  const f_path = resolveHome(preferences.zotero_path);

  // Work on private, per-call copies inside the extension's support directory.
  // The paths are ours (not user-controlled) and unique per invocation, so
  // concurrent opens can't clobber each other's files, and nothing is left on
  // disk once we return.
  const base = path.join(utils.supportPath, `zotero-${process.pid}-${dbSeq++}`);
  const copyPath = base + ".sqlite";
  const slimPath = base + ".slim";
  const tempFiles = [copyPath, copyPath + "-wal", copyPath + "-shm", slimPath];

  try {
    // Copy the main database file to an unlocked location.
    await copyFile(f_path, copyPath);

    const wasmBinary = readFileSync(path.join(environment.assetsPath, "sql-wasm.wasm"));
    const SQL = await initSqlJs({ wasmBinary });

    // Prefer the slim copy; fall back to the full database if slimming failed.
    const slim = buildSlimDb(copyPath, slimPath);
    return new SQL.Database(slim ?? readFileSync(copyPath));
  } finally {
    // The temp files are only needed while we read them into memory above.
    for (const p of tempFiles) {
      rmSync(p, { force: true });
    }
  }
}

async function getBibtexKey(key: string, library: string): Promise<string> {
  const bibtexDb = await openBibtexDb();
  if (!bibtexDb) {
    return "";
  }
  const [db, isBBTUpdated] = bibtexDb;
  const st = db.prepare(isBBTUpdated ? BIBTEX_SQL : BIBTEX_SQL_OLD);
  st.bind({ ":key": key, ":lib": library });
  st.step();
  const res = st.getAsObject();
  st.free();
  db.close();

  if (res && res.citekey) {
    return res.citekey as string;
  } else {
    return "";
  }
}

async function openBibtexDb(): Promise<[SqlJsDatabase, boolean] | null> {
  const preferences: Preferences = getPreferenceValues();
  const f_path = resolveHome(preferences.zotero_path);
  const newPath = f_path.replace("zotero.sqlite", "better-bibtex.sqlite");
  const migratedPath = f_path.replace("zotero.sqlite", "better-bibtex.migrated");
  const oldPath = f_path.replace("zotero.sqlite", "better-bibtex-search.sqlite");

  let dbPath: string;
  let isBBTUpdated: boolean;

  if (existsSync(newPath)) {
    dbPath = newPath;
    isBBTUpdated = true;
  } else if (existsSync(migratedPath)) {
    // Zotero 7+ renames better-bibtex.sqlite to better-bibtex.migrated
    dbPath = migratedPath;
    isBBTUpdated = true;
  } else if (existsSync(oldPath)) {
    dbPath = oldPath;
    isBBTUpdated = false;
  } else {
    return null;
  }

  const wasmBinary = readFileSync(path.join(environment.assetsPath, "sql-wasm.wasm"));
  const SQL = await initSqlJs({ wasmBinary });
  const db = readFileSync(dbPath);
  return [new SQL.Database(db), isBBTUpdated];
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

    if (st4.step()) {
      const at = st4.getAsObject();
      if (at.key) {
        row.attachment = at;
      }
    }
    st4.free();

    const stNotes = db.prepare(NOTES_SQL);
    stNotes.bind({ ":id": row.id });

    const notes = [];
    while (stNotes.step()) {
      const note = stripNoteHtml(stNotes.getAsObject().note as string);
      if (note) {
        notes.push(note);
      }
    }
    stNotes.free();

    if (notes.length > 0) {
      row.notes = notes;
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
      row.citekey = row.citationKey || (await getBibtexKey(row.key, row.library));
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
      version: CACHE_VERSION,
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
      // The cache is valid as long as the Zotero database has not been written
      // since the cache was built. Comparing the source file's mtime is far
      // cheaper than opening the database (a copy + slim rebuild) on every
      // keystroke, and Zotero rewrites the file on any change so it never serves
      // stale data.
      const sourceTime = await mtime(resolveHome(preferences.zotero_path));
      if (sourceTime < cacheTime) {
        const cacheBuffer = await readFile(cachePath);
        const fData = JSON.parse(cacheBuffer.toString());
        if (
          fData.version === CACHE_VERSION &&
          fData.zotero_path === preferences.zotero_path &&
          fData.use_bibtex === preferences.use_bibtex
        ) {
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
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to read Zotero database",
        message: err instanceof Error ? err.message : String(err),
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
        name: "notes",
        weight: 6,
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
