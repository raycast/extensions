import { homedir } from "os";
import { join } from "path";
import { open, Database } from "sqlite";
import sqlite3 from "sqlite3";
import { ZoteroItem, ZoteroCollection } from "./types/zoteroItems";

// Define the missing types
export interface ZoteroCreator {
  firstName?: string;
  lastName?: string;
  name?: string;
  creatorType: string;
}

interface DatabaseItem {
  key: string;
  itemType: string;
  title: string;
  creators: string;
  date?: string;
  publicationTitle?: string;
}

interface DatabaseCollection {
  collectionID: number;
  key: string;
  name: string;
  parentCollectionID: number | null;
}

// Define interface for local data source
interface LocalZoteroDatabase {
  getItems(): Promise<ZoteroItem[]>;
  getCollections(): Promise<ZoteroCollection[]>;
  getItemsByCollection(collectionKey: string): Promise<ZoteroItem[]>;
}

class ZoteroLocalDatabase implements LocalZoteroDatabase {
  private dbPath: string;
  private db: Database | null = null;

  constructor() {
    this.dbPath = join(homedir(), "Zotero", "zotero.sqlite");
  }

  private async initialize(): Promise<boolean> {
    if (this.db) {
      return true;
    }

    try {
      console.log("Opening database at:", this.dbPath);

      // Open the database with promise-based API
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database,
        mode: sqlite3.OPEN_READONLY,
      });

      console.log("Successfully connected to Zotero database");
      return true;
    } catch (error) {
      console.error("Failed to connect to local Zotero database:", error);
      return false;
    }
  }

  async getItems(): Promise<ZoteroItem[]> {
    if (!(await this.initialize())) return [];

    try {
      if (!this.db) throw new Error("Database not initialized");

      const items = await this.db.all<DatabaseItem[]>(`
        SELECT i.itemID, i.key, it.typeName as itemType, 
               id.valueText as title,
               GROUP_CONCAT(c.lastName || ', ' || c.firstName, '; ') as creators,
               date.valueText as date,
               pub.valueText as publicationTitle
        FROM items i
        JOIN itemTypes it ON i.itemTypeID = it.itemTypeID
        LEFT JOIN itemData id ON i.itemID = id.itemID
        LEFT JOIN fields fTitle ON id.fieldID = fTitle.fieldID AND fTitle.fieldName = 'title'
        LEFT JOIN itemData date ON i.itemID = date.itemID
        LEFT JOIN fields fDate ON date.fieldID = fDate.fieldID AND fDate.fieldName = 'date'
        LEFT JOIN itemData pub ON i.itemID = pub.itemID
        LEFT JOIN fields fPub ON pub.fieldID = fPub.fieldID AND fPub.fieldName = 'publicationTitle'
        LEFT JOIN itemCreators ic ON i.itemID = ic.itemID
        LEFT JOIN creators c ON ic.creatorID = c.creatorID
        WHERE i.itemID NOT IN (SELECT itemID FROM deletedItems)
        AND it.typeName NOT IN ('attachment', 'note')
        GROUP BY i.itemID
        ORDER BY id.valueText
      `);

      return items.map((item: DatabaseItem) => ({
        key: item.key,
        version: 0,
        library: {
          type: "user",
          id: 0,
          name: "My Library",
          links: {},
        },
        data: {
          key: item.key,
          itemType: item.itemType,
          title: item.title || "Untitled",
          creators: item.creators
            ? item.creators.split("; ").map((creator: string) => {
                if (!creator) return { creatorType: "author" };
                const [lastName, firstName] = creator.split(", ");
                return { lastName, firstName, creatorType: "author" };
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
      }));
    } catch (error) {
      console.error("Error fetching items:", error);
      return [];
    }
  }

  async getCollections(): Promise<ZoteroCollection[]> {
    if (!(await this.initialize())) return [];

    try {
      if (!this.db) throw new Error("Database not initialized");

      const collections = await this.db.all<DatabaseCollection[]>(`
        SELECT collectionID, key, collectionName as name, parentCollectionID
        FROM collections
        WHERE collectionID NOT IN (SELECT collectionID FROM deletedCollections)
        ORDER BY name
      `);

      return collections.map((collection: DatabaseCollection) => ({
        key: collection.key,
        version: 0,
        data: {
          key: collection.key,
          name: collection.name,
          parentCollection: collection.parentCollectionID
            ? collections.find(
                (c: DatabaseCollection) => c.collectionID === collection.parentCollectionID,
              )?.key || false
            : false,
        },
        meta: {},
        links: {},
      }));
    } catch (error) {
      console.error("Error fetching collections:", error);
      return [];
    }
  }

  async getItemsByCollection(collectionKey: string): Promise<ZoteroItem[]> {
    if (!(await this.initialize())) return [];

    try {
      if (!this.db) throw new Error("Database not initialized");

      const items = await this.db.all<DatabaseItem[]>(
        `
        SELECT i.itemID, i.key, it.typeName as itemType, 
               id.valueText as title,
               GROUP_CONCAT(c.lastName || ', ' || c.firstName, '; ') as creators,
               date.valueText as date,
               pub.valueText as publicationTitle
        FROM items i
        JOIN itemTypes it ON i.itemTypeID = it.itemTypeID
        JOIN collectionItems ci ON i.itemID = ci.itemID
        JOIN collections col ON ci.collectionID = col.collectionID
        LEFT JOIN itemData id ON i.itemID = id.itemID
        LEFT JOIN fields fTitle ON id.fieldID = fTitle.fieldID AND fTitle.fieldName = 'title'
        LEFT JOIN itemData date ON i.itemID = date.itemID
        LEFT JOIN fields fDate ON date.fieldID = fDate.fieldID AND fDate.fieldName = 'date'
        LEFT JOIN itemData pub ON i.itemID = pub.itemID
        LEFT JOIN fields fPub ON pub.fieldID = fPub.fieldID AND fPub.fieldName = 'publicationTitle'
        LEFT JOIN itemCreators ic ON i.itemID = ic.itemID
        LEFT JOIN creators c ON ic.creatorID = c.creatorID
        WHERE col.key = ?
        AND i.itemID NOT IN (SELECT itemID FROM deletedItems)
        AND it.typeName NOT IN ('attachment', 'note')
        GROUP BY i.itemID
        ORDER BY id.valueText
      `,
        [collectionKey],
      );

      return items.map((item: DatabaseItem) => ({
        key: item.key,
        version: 0,
        library: {
          type: "user",
          id: 0,
          name: "My Library",
          links: {},
        },
        data: {
          key: item.key,
          itemType: item.itemType,
          title: item.title || "Untitled",
          creators: item.creators
            ? item.creators.split("; ").map((creator: string) => {
                if (!creator) return { creatorType: "author" };
                const [lastName, firstName] = creator.split(", ");
                return { lastName, firstName, creatorType: "author" };
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
      }));
    } catch (error) {
      console.error("Error fetching items by collection:", error);
      return [];
    }
  }
}

// Modify the main Zotero class to support both API and local database
export default class Zotero {
  private apiKey: string;
  private userId: string;
  private localDatabase: ZoteroLocalDatabase | null = null;

  constructor(apiKey?: string, userId?: string) {
    this.apiKey = apiKey || "";
    this.userId = userId || "";
    // FORCE local database mode
    console.log("Zotero initialized - FORCING local database mode");
    this.localDatabase = new ZoteroLocalDatabase();
  }

  async getItems(): Promise<ZoteroItem[]> {
    if (this.localDatabase) {
      return this.localDatabase.getItems();
    }
    // Re-initialize if somehow not initialized
    this.localDatabase = new ZoteroLocalDatabase();
    return this.localDatabase.getItems();
  }

  async getCollections(): Promise<ZoteroCollection[]> {
    if (this.localDatabase) {
      return this.localDatabase.getCollections();
    }
    // Re-initialize if somehow not initialized
    this.localDatabase = new ZoteroLocalDatabase();
    return this.localDatabase.getCollections();
  }

  async getItemsByCollection(collectionKey: string): Promise<ZoteroItem[]> {
    if (this.localDatabase) {
      return this.localDatabase.getItemsByCollection(collectionKey);
    }
    // Re-initialize if somehow not initialized
    this.localDatabase = new ZoteroLocalDatabase();
    return this.localDatabase.getItemsByCollection(collectionKey);
  }
}

// ... existing code ...
