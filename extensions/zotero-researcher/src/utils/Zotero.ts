import { homedir } from "os";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";

const execFileAsync = promisify(execFile);

export interface ZoteroCreator {
  firstName?: string;
  lastName?: string;
  name?: string;
  creatorType: string;
}

export interface ZoteroItem {
  key: string;
  version: number;
  data: {
    key: string;
    itemType: string;
    title: string;
    creators: Array<{
      firstName?: string;
      lastName?: string;
      name?: string;
      creatorType: string;
    }>;
    date?: string;
    publicationTitle?: string;
  };
  meta: {
    createdByUser: boolean;
    numChildren: number;
  };
  links: Record<string, string | unknown>;
}

export interface ZoteroCollection {
  key: string;
  version: number;
  data: {
    key: string;
    name: string;
    parentCollection: string | boolean;
    [key: string]: string | boolean | undefined;
  };
  meta: {
    [key: string]: unknown;
  };
  links: {
    [key: string]: unknown;
  };
}

interface DatabaseItem {
  key: string;
  itemType: string;
  title: string;
  creators: string;
  date?: string;
  publicationTitle?: string;
}

interface SchemaInfo {
  valueColumnName: string;
  useValueTable: boolean;
}

interface CollectionData {
  key: string;
  name: string;
  parentCollectionID: number | null;
}

export default class Zotero {
  private dbPath: string;
  private schemaInfo: SchemaInfo | null = null;

  constructor() {
    this.dbPath = join(homedir(), "Zotero", "zotero.sqlite");
    console.log("Zotero initialized with database at:", this.dbPath);

    if (!existsSync(this.dbPath)) {
      throw new Error(`Zotero database not found at: ${this.dbPath}`);
    }
  }

  private async runQuery<T>(query: string): Promise<T[]> {
    try {
      console.log("Running query:", query);

      const { stdout, stderr } = await execFileAsync("sqlite3", ["-json", this.dbPath, query]);

      if (stderr) {
        console.error("SQLite error:", stderr);
      }

      console.log("Query result length:", stdout.length);
      if (stdout.length < 100) {
        console.log("Result preview:", stdout);
      }

      const result = JSON.parse(stdout || "[]");
      console.log("Parsed result count:", result.length);

      return result;
    } catch (error) {
      console.error("Database query error:", error);
      return [];
    }
  }

  // Helper function to discover the database schema
  private async discoverSchema(): Promise<SchemaInfo> {
    if (this.schemaInfo) {
      return this.schemaInfo;
    }

    console.log("=== Discovering Database Schema ===");

    // Check what columns exist in the itemData table
    const itemDataColumns = await this.runQuery<{ name: string; type: string }>(
      `PRAGMA table_info(itemData)`,
    );
    console.log("itemData columns:", itemDataColumns);

    // Sample of the itemData contents
    const itemDataSample = await this.runQuery<Record<string, unknown>>(
      `SELECT * FROM itemData LIMIT 5`,
    );
    console.log("itemData sample:", itemDataSample);

    // Check if the itemDataValues table exists
    const valueTableExists = await this.runQuery<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='itemDataValues'`,
    );
    console.log("itemDataValues table exists:", valueTableExists.length > 0);

    // Determine schema type and column names
    let valueColumnName = "value";
    let useValueTable = false;

    // Check if we're using a reference ID schema
    if (itemDataColumns.some((col) => col.name === "valueID")) {
      valueColumnName = "valueID";
      useValueTable = valueTableExists.length > 0;
    } else if (itemDataColumns.some((col) => col.name === "value")) {
      valueColumnName = "value";
    } else if (itemDataColumns.some((col) => col.name === "valueText")) {
      valueColumnName = "valueText";
    } else {
      // If no known column, take the third column (fieldID is 1, itemID is 2, value is typically 3)
      if (itemDataColumns.length >= 3) {
        valueColumnName = itemDataColumns[2].name;
      }
    }

    console.log(`Detected value column name: ${valueColumnName}`);
    console.log(`Using value table: ${useValueTable}`);
    console.log("=== End Schema Discovery ===");

    this.schemaInfo = {
      valueColumnName,
      useValueTable,
    };

    return this.schemaInfo;
  }

  // Helper to get actual field value from the database
  private async getItemField(itemKey: string, fieldName: string): Promise<string | undefined> {
    const schema = await this.discoverSchema();

    if (schema.useValueTable && schema.valueColumnName === "valueID") {
      // Use the reference table approach (valueID → itemDataValues)
      const query = `
        SELECT v.value
        FROM items i
        JOIN itemData d ON i.itemID = d.itemID
        JOIN fields f ON d.fieldID = f.fieldID
        JOIN itemDataValues v ON d.valueID = v.valueID
        WHERE i.key = '${itemKey}'
        AND f.fieldName = '${fieldName}'
      `;

      const results = await this.runQuery<{ value: string }>(query);
      return results.length > 0 ? results[0].value : undefined;
    } else {
      // Use direct value approach
      const query = `
        SELECT d.${schema.valueColumnName} as value
        FROM items i
        JOIN itemData d ON i.itemID = d.itemID
        JOIN fields f ON d.fieldID = f.fieldID
        WHERE i.key = '${itemKey}'
        AND f.fieldName = '${fieldName}'
      `;

      const results = await this.runQuery<{ value: string }>(query);
      return results.length > 0 ? results[0].value : undefined;
    }
  }

  async getItems(): Promise<ZoteroItem[]> {
    // Get basic items without field values
    const query = `
      SELECT 
        i.key, 
        it.typeName as itemType
      FROM items i
      JOIN itemTypes it ON i.itemTypeID = it.itemTypeID
      WHERE i.itemID NOT IN (SELECT itemID FROM deletedItems)
        AND it.typeName NOT IN ('attachment', 'note')
      LIMIT 50
    `;

    const basicItems = await this.runQuery<DatabaseItem>(query);
    console.log(`Found ${basicItems.length} basic items`);

    if (basicItems.length === 0) {
      console.log("No items found. Returning empty array.");
      return [];
    }

    // Now get the full details for these items
    const enhancedItems = await Promise.all(
      basicItems.map(async (item) => {
        // Get fields
        const title = (await this.getItemField(item.key, "title")) || "Untitled";
        const date = await this.getItemField(item.key, "date");
        const publicationTitle = await this.getItemField(item.key, "publicationTitle");

        // Get creators separately
        const creatorsQuery = `
        SELECT c.lastName, c.firstName
        FROM creators c
        JOIN itemCreators ic ON c.creatorID = ic.creatorID
        JOIN items i ON ic.itemID = i.itemID
        WHERE i.key = '${item.key}'
      `;

        const creators = await this.runQuery<{ lastName: string; firstName: string }>(
          creatorsQuery,
        );
        const creatorString = creators
          .map((c) => `${c.lastName || ""}, ${c.firstName || ""}`)
          .join("; ");

        return {
          ...item,
          title,
          creators: creatorString,
          date,
          publicationTitle,
        };
      }),
    );

    console.log(`Enhanced ${enhancedItems.length} items with full details`);
    return enhancedItems.map((item) => this.mapItem(item));
  }

  async getCollections(): Promise<ZoteroCollection[]> {
    const query = `
      SELECT key, collectionName as name, parentCollectionID
      FROM collections
      WHERE collectionID NOT IN (SELECT collectionID FROM deletedCollections)
      ORDER BY name
    `;

    const collections = await this.runQuery<CollectionData>(query);
    console.log(`Found ${collections.length} collections`);
    return collections.map((col) => this.mapCollection(col, collections));
  }

  async getItemsByCollection(collectionKey: string): Promise<ZoteroItem[]> {
    console.log(`Getting items for collection: ${collectionKey}`);
    const escapedKey = collectionKey.replace(/'/g, "''");

    // Get basic items first
    const query = `
      SELECT 
        i.key, 
        it.typeName as itemType
      FROM items i
      JOIN itemTypes it ON i.itemTypeID = it.itemTypeID
      JOIN collectionItems ci ON i.itemID = ci.itemID
      JOIN collections col ON ci.collectionID = col.collectionID
      WHERE col.key = '${escapedKey}'
        AND i.itemID NOT IN (SELECT itemID FROM deletedItems)
        AND it.typeName NOT IN ('attachment', 'note')
      LIMIT 50
    `;

    const basicItems = await this.runQuery<DatabaseItem>(query);
    console.log(`Found ${basicItems.length} basic items in collection`);

    if (basicItems.length === 0) {
      return [];
    }

    // Now get the full details for these items
    const enhancedItems = await Promise.all(
      basicItems.map(async (item) => {
        // Get fields
        const title = (await this.getItemField(item.key, "title")) || "Untitled";
        const date = await this.getItemField(item.key, "date");
        const publicationTitle = await this.getItemField(item.key, "publicationTitle");

        // Get creators separately
        const creatorsQuery = `
        SELECT c.lastName, c.firstName
        FROM creators c
        JOIN itemCreators ic ON c.creatorID = ic.creatorID
        JOIN items i ON ic.itemID = i.itemID
        WHERE i.key = '${item.key}'
      `;

        const creators = await this.runQuery<{ lastName: string; firstName: string }>(
          creatorsQuery,
        );
        const creatorString = creators
          .map((c) => `${c.lastName || ""}, ${c.firstName || ""}`)
          .join("; ");

        return {
          ...item,
          title,
          creators: creatorString,
          date,
          publicationTitle,
        };
      }),
    );

    console.log(`Enhanced ${enhancedItems.length} items with full details`);
    return enhancedItems.map((item) => this.mapItem(item));
  }

  private mapItem(item: DatabaseItem): ZoteroItem {
    return {
      key: item.key,
      version: 0,
      data: {
        key: item.key,
        itemType: item.itemType,
        title: item.title || "Untitled",
        creators: item.creators
          ? item.creators
              .split("; ")
              .filter(Boolean)
              .map((creator: string) => {
                const parts = creator.split(", ").map((s) => s.trim());
                const lastName = parts[0] || "";
                const firstName = parts[1] || "";
                return {
                  lastName,
                  firstName,
                  creatorType: "author",
                };
              })
          : [],
        date: item.date,
        publicationTitle: item.publicationTitle,
      },
      meta: {
        createdByUser: true,
        numChildren: 0,
      },
      links: {},
    };
  }

  private mapCollection(col: CollectionData, allCollections: CollectionData[]): ZoteroCollection {
    return {
      key: col.key,
      version: 0,
      data: {
        key: col.key,
        name: col.name,
        parentCollection: col.parentCollectionID
          ? allCollections.find((c) => c.parentCollectionID === col.parentCollectionID)?.key ||
            false
          : false,
      },
      meta: {},
      links: {},
    };
  }
}
