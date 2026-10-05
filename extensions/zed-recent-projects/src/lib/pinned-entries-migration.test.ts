import { describe, it, expect, beforeEach } from "vitest";
import {
  migrateFromV0,
  migrateFromV1,
  runMigration,
  PINNED_STORE_VERSION_KEY,
  PINNED_STORE_VERSION,
  PINNED_ENTRIES_CACHE_KEY,
  LegacyPinnedEntryV0,
  LegacyPinnedEntryV1,
  CacheStore,
} from "./pinned-entries-migration";

/**
 * Mock cache store for testing migrations
 */
class MockCacheStore implements CacheStore {
  private store: Map<string, string> = new Map();

  get(key: string): string | undefined {
    return this.store.get(key);
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }

  clear(): void {
    this.store.clear();
  }
}

describe("Pinned Entries Migrations", () => {
  describe("migrateFromV0", () => {
    it("should migrate v0 entries with is_remote=false to local type with paths array", () => {
      const v0Entries: Record<string, LegacyPinnedEntryV0> = {
        "file:///Users/test/project": {
          id: 1,
          uri: "file:///Users/test/project",
          path: "/Users/test/project",
          title: "project",
          subtitle: "~/test",
          is_remote: false,
          order: 0,
        },
      };

      const result = migrateFromV0(v0Entries);

      expect(result["file:///Users/test/project"]).toEqual({
        id: 1,
        uri: "file:///Users/test/project",
        paths: ["/Users/test/project"],
        title: "project",
        subtitle: "~/test",
        type: "local",
        order: 0,
      });
    });

    it("should migrate v0 entries with is_remote=true to remote type with paths array", () => {
      const v0Entries: Record<string, LegacyPinnedEntryV0> = {
        "ssh://user@host/project": {
          id: 2,
          uri: "ssh://user@host/project",
          path: "project",
          title: "project",
          subtitle: "/home/user [SSH: host]",
          is_remote: true,
          order: 0,
        },
      };

      const result = migrateFromV0(v0Entries);

      expect(result["ssh://user@host/project"]).toEqual({
        id: 2,
        uri: "ssh://user@host/project",
        paths: ["project"],
        title: "project",
        subtitle: "/home/user [SSH: host]",
        type: "remote",
        order: 0,
      });
    });

    it("should use basename of path as title if title is empty", () => {
      const v0Entries: Record<string, LegacyPinnedEntryV0> = {
        "file:///Users/test/my-project": {
          id: 1,
          uri: "file:///Users/test/my-project",
          path: "/Users/test/my-project",
          title: "",
          subtitle: "~/test",
          is_remote: false,
          order: 0,
        },
      };

      const result = migrateFromV0(v0Entries);

      expect(result["file:///Users/test/my-project"].title).toBe("my-project");
    });

    it("should preserve order for multiple entries", () => {
      const v0Entries: Record<string, LegacyPinnedEntryV0> = {
        "file:///project1": {
          id: 1,
          uri: "file:///project1",
          path: "/project1",
          title: "project1",
          subtitle: "/",
          is_remote: false,
          order: 0,
        },
        "file:///project2": {
          id: 2,
          uri: "file:///project2",
          path: "/project2",
          title: "project2",
          subtitle: "/",
          is_remote: false,
          order: 1,
        },
        "file:///project3": {
          id: 3,
          uri: "file:///project3",
          path: "/project3",
          title: "project3",
          subtitle: "/",
          is_remote: false,
          order: 2,
        },
      };

      const result = migrateFromV0(v0Entries);

      expect(result["file:///project1"].order).toBe(0);
      expect(result["file:///project2"].order).toBe(1);
      expect(result["file:///project3"].order).toBe(2);
    });
  });

  describe("migrateFromV1", () => {
    it("should migrate v1 entries with single path to paths array", () => {
      const v1Entries: Record<string, LegacyPinnedEntryV1> = {
        "file:///Users/test/project": {
          id: 1,
          uri: "file:///Users/test/project",
          path: "/Users/test/project",
          title: "project",
          subtitle: "~/test",
          type: "local",
          order: 0,
        },
      };

      const result = migrateFromV1(v1Entries);

      expect(result["file:///Users/test/project"]).toEqual({
        id: 1,
        uri: "file:///Users/test/project",
        paths: ["/Users/test/project"],
        title: "project",
        subtitle: "~/test",
        type: "local",
        order: 0,
      });
    });

    it("should preserve remote type from v1", () => {
      const v1Entries: Record<string, LegacyPinnedEntryV1> = {
        "ssh://user@host/project": {
          id: 2,
          uri: "ssh://user@host/project",
          path: "project",
          title: "project",
          subtitle: "/home/user [SSH: host]",
          type: "remote",
          order: 0,
        },
      };

      const result = migrateFromV1(v1Entries);

      expect(result["ssh://user@host/project"].type).toBe("remote");
      expect(result["ssh://user@host/project"].paths).toEqual(["project"]);
    });

    it("should use basename of path as title if title is empty", () => {
      const v1Entries: Record<string, LegacyPinnedEntryV1> = {
        "file:///Users/test/awesome-project": {
          id: 1,
          uri: "file:///Users/test/awesome-project",
          path: "/Users/test/awesome-project",
          title: "",
          subtitle: "~/test",
          type: "local",
          order: 0,
        },
      };

      const result = migrateFromV1(v1Entries);

      expect(result["file:///Users/test/awesome-project"].title).toBe("awesome-project");
    });
  });

  describe("runMigration", () => {
    let mockCache: MockCacheStore;

    beforeEach(() => {
      mockCache = new MockCacheStore();
    });

    it("should set version to current if no cache exists and no version set", () => {
      runMigration(mockCache);

      expect(mockCache.get(PINNED_STORE_VERSION_KEY)).toBe(PINNED_STORE_VERSION);
      expect(mockCache.get(PINNED_ENTRIES_CACHE_KEY)).toBeUndefined();
    });

    it("should migrate from v0 format when no version is set", () => {
      const v0Data: Record<string, LegacyPinnedEntryV0> = {
        "file:///project": {
          id: 1,
          uri: "file:///project",
          path: "/project",
          title: "project",
          subtitle: "/",
          is_remote: false,
          order: 0,
        },
      };
      mockCache.set(PINNED_ENTRIES_CACHE_KEY, JSON.stringify(v0Data));

      runMigration(mockCache);

      expect(mockCache.get(PINNED_STORE_VERSION_KEY)).toBe(PINNED_STORE_VERSION);

      const migratedData = JSON.parse(mockCache.get(PINNED_ENTRIES_CACHE_KEY)!);
      expect(migratedData["file:///project"].paths).toEqual(["/project"]);
      expect(migratedData["file:///project"].type).toBe("local");
      expect(migratedData["file:///project"].is_remote).toBeUndefined();
    });

    it("should migrate from v1 format when version is 1", () => {
      const v1Data: Record<string, LegacyPinnedEntryV1> = {
        "file:///project": {
          id: 1,
          uri: "file:///project",
          path: "/project",
          title: "project",
          subtitle: "/",
          type: "local",
          order: 0,
        },
      };
      mockCache.set(PINNED_STORE_VERSION_KEY, "1");
      mockCache.set(PINNED_ENTRIES_CACHE_KEY, JSON.stringify(v1Data));

      runMigration(mockCache);

      expect(mockCache.get(PINNED_STORE_VERSION_KEY)).toBe(PINNED_STORE_VERSION);

      const migratedData = JSON.parse(mockCache.get(PINNED_ENTRIES_CACHE_KEY)!);
      expect(migratedData["file:///project"].paths).toEqual(["/project"]);
      expect(migratedData["file:///project"].path).toBeUndefined();
    });

    it("should not modify cache if already at current version", () => {
      const currentData = {
        "file:///project": {
          id: 1,
          uri: "file:///project",
          paths: ["/project"],
          title: "project",
          subtitle: "/",
          type: "local",
          order: 0,
        },
      };
      mockCache.set(PINNED_STORE_VERSION_KEY, PINNED_STORE_VERSION);
      mockCache.set(PINNED_ENTRIES_CACHE_KEY, JSON.stringify(currentData));

      const originalData = mockCache.get(PINNED_ENTRIES_CACHE_KEY);
      runMigration(mockCache);

      expect(mockCache.get(PINNED_ENTRIES_CACHE_KEY)).toBe(originalData);
    });

    it("should handle empty v1 cache gracefully", () => {
      mockCache.set(PINNED_STORE_VERSION_KEY, "1");
      // No entries set

      runMigration(mockCache);

      expect(mockCache.get(PINNED_STORE_VERSION_KEY)).toBe(PINNED_STORE_VERSION);
    });

    it("should handle invalid JSON gracefully without crashing", () => {
      mockCache.set(PINNED_ENTRIES_CACHE_KEY, "invalid json {{{");

      // Should not throw
      expect(() => runMigration(mockCache)).not.toThrow();
    });
  });
});
