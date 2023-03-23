import { Cache, environment } from "@raycast/api";
import { readFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import initSqlJs, { Database, ParamsObject, Statement } from "sql.js";
import {
  SEARCH_BACKLINKS_V1,
  SEARCH_BACKLINKS_V2,
  SEARCH_LINKS_V1,
  SEARCH_LINKS_V2,
  SEARCH_NOTES_V1,
  SEARCH_NOTES_V2,
} from "./db-queries";

export interface Note {
  id: string;
  title: string;
  text: string;
  modifiedAt: Date;
  createdAt: Date;
  tags: string[];
  encrypted: boolean;
  formattedTags: string;
  wordCount: number;
}

const BEAR_DB_PATH =
  homedir() + "/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite";

const BEAR_EPOCH = 978307200; // Start of 2001 as a timestamp

export async function loadDatabase(): Promise<BearDb> {
  const wasmBinary = readFileSync(path.join(environment.assetsPath, "sql-wasm.wasm"));
  const SQL = await initSqlJs({ wasmBinary });
  const db = readFileSync(BEAR_DB_PATH);
  return new BearDb(new SQL.Database(db));
}

function formatTags(tags: string[]): string {
  if (tags.length === 0) {
    return "Not Tagged";
  }
  const formattedTags = [];
  for (const tag of tags) {
    // Only format tag if tag is not subtag
    if (tags.filter((t) => t.includes(tag)).length < 2) {
      // Format tags with spaces like Bear (two hashtags)
      formattedTags.push(tag.includes(" ") ? `#${tag}#` : `#${tag}`);
    }
  }
  return formattedTags.join(" ");
}

export class BearDb {
  database: Database;
  cache: Cache;

  static searchNotesQueries = {
    v1: SEARCH_NOTES_V1,
    v2: SEARCH_NOTES_V2,
  };

  static getNoteLinksQueries = {
    v1: SEARCH_LINKS_V1,
    v2: SEARCH_LINKS_V2,
  };

  static getNoteBacklinksQueries = {
    v1: SEARCH_BACKLINKS_V1,
    v2: SEARCH_BACKLINKS_V2,
  };

  constructor(database: Database) {
    this.database = database;
    this.cache = new Cache();
  }

  close() {
    this.database.close();
  }

  private toNote(row: ParamsObject): Note {
    const tags = (row.tags as string | undefined)?.split(",") ?? [];
    const text = (row.text as string) ?? "";
    return {
      id: row.id as string,
      title: row.title as string,
      text,
      modifiedAt: new Date(((row.modified_at as number) + BEAR_EPOCH) * 1000),
      createdAt: new Date(((row.created_at as number) + BEAR_EPOCH) * 1000),
      tags: tags,
      formattedTags: formatTags(tags),
      encrypted: row.encrypted === 1,
      wordCount: [...text.matchAll(/\b\w+\b/g)].length,
    };
  }

  getNotes(searchQuery: string): Note[] {
    let statement: Statement;
    try {
      const bearVersion = parseInt(this.cache.get("bearVersion") ?? "1");
      statement = this.database.prepare(
        bearVersion === 2 ? BearDb.searchNotesQueries.v2 : BearDb.searchNotesQueries.v1
      );
    } catch (error) {
      if (error instanceof Error && error.message === "no such table: Z_7TAGS") {
        statement = this.database.prepare(BearDb.searchNotesQueries.v2);
        this.cache.set("bearVersion", "2");
      } else if (error instanceof Error && error.message === "no such table: Z_5TAGS") {
        statement = this.database.prepare(BearDb.searchNotesQueries.v1);
        this.cache.set("bearVersion", "1");
      } else throw error;
    }
    statement.bind({ ":query": searchQuery });
    const results: Note[] = [];
    while (statement.step()) {
      const row = statement.getAsObject();
      results.push(this.toNote(row));
    }

    statement.free();

    return results;
  }

  getBacklinks(noteID: string): Note[] {
    const bearVersion = parseInt(this.cache.get("bearVersion") ?? "1");
    const statement = this.database.prepare(
      bearVersion === 1 ? BearDb.getNoteBacklinksQueries.v1 : BearDb.getNoteBacklinksQueries.v2
    );
    statement.bind({ ":id": noteID });

    const results: Note[] = [];
    while (statement.step()) {
      const row = statement.getAsObject();
      results.push(this.toNote(row));
    }

    statement.free();

    return results;
  }

  getNoteLinks(noteID: string): Note[] {
    const bearVersion = parseInt(this.cache.get("bearVersion") ?? "1");
    const statement = this.database.prepare(
      bearVersion === 1 ? BearDb.getNoteLinksQueries.v1 : BearDb.getNoteLinksQueries.v2
    );
    statement.bind({ ":id": noteID });

    const results: Note[] = [];
    while (statement.step()) {
      const row = statement.getAsObject();
      results.push(this.toNote(row));
    }

    statement.free();

    return results;
  }
}
