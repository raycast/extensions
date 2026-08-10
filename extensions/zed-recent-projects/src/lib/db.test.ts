import { describe, it, expect } from "vitest";
import { existsSync, statSync } from "fs";

/**
 * Check if a fixture file exists and is a valid database (not empty).
 */
function isValidFixture(path: string): boolean {
  if (!existsSync(path)) return false;
  try {
    const stat = statSync(path);
    return stat.size > 0;
  } catch {
    return false;
  }
}
import {
  queryDb,
  getZedWorkspaceDbVersion,
  getZedWorkspacesQuery,
  ZED_WORKSPACES_QUERY,
  MIN_SUPPORTED_DB_VERSION,
} from "./db";
import { parseZedWorkspace, type ZedWorkspace } from "./workspaces";

/**
 * Integration tests for Zed DB queries.
 *
 * These tests require fixture files that must be generated from a real Zed database.
 * See CONTRIBUTING.md for instructions on generating fixtures.
 *
 * If fixtures don't exist, the integration tests will be skipped.
 */
describe("Zed DB Integration Tests", () => {
  describe("v34 Schema", () => {
    const dbPath = "test/fixtures/zed-db-v34.sqlite";
    const fixtureExists = isValidFixture(dbPath);

    it.skipIf(!fixtureExists)("should detect correct version", async () => {
      const result = await getZedWorkspaceDbVersion(dbPath);
      expect(result.version).toBe(34);
      expect(result.supported).toBe(true);
    });

    it.skipIf(!fixtureExists)("should fetch and parse workspaces correctly", async () => {
      const query = getZedWorkspacesQuery(34);
      const output = await queryDb(dbPath, query);
      const rows = output
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => line.split("\t"));

      const zedWorkspaces = rows.map((row) => {
        const type = row[0] as "local" | "remote";
        const base = {
          id: parseInt(row[1], 10),
          paths: row[2],
          paths_order: row[3] || null,
          timestamp: parseInt(row[4], 10),
          window_id: row[5] ? parseInt(row[5], 10) : null,
          session_id: row[6] || null,
        };

        if (type === "local") {
          return { ...base, type } as ZedWorkspace;
        }

        return {
          ...base,
          type,
          host: row[7] || "",
          user: row[8] || null,
          port: row[9] ? parseInt(row[9], 10) : null,
          kind: row[10] || "ssh",
          distro: row[11] || null,
          name: row[12] || null,
        } as ZedWorkspace;
      });

      const parsedWorkspaces = zedWorkspaces
        .map(parseZedWorkspace)
        .filter((ws): ws is NonNullable<typeof ws> => ws !== null);
      expect(parsedWorkspaces).toMatchSnapshot();
    });
  });

  describe("Version Support", () => {
    const dbPath = "test/fixtures/zed-db-v30.sqlite";
    const fixtureExists = isValidFixture(dbPath);

    it.skipIf(!fixtureExists)("should mark versions below MIN_SUPPORTED_DB_VERSION as unsupported", async () => {
      const result = await getZedWorkspaceDbVersion(dbPath);
      expect(result.version).toBe(30);
      expect(result.supported).toBe(false);
    });

    it("should have MIN_SUPPORTED_DB_VERSION set to 34", () => {
      expect(MIN_SUPPORTED_DB_VERSION).toBe(34);
    });
  });

  describe("Query Selection", () => {
    it("should return the same query for all supported versions", () => {
      expect(getZedWorkspacesQuery(34)).toBe(ZED_WORKSPACES_QUERY);
      expect(getZedWorkspacesQuery(35)).toBe(ZED_WORKSPACES_QUERY);
      expect(getZedWorkspacesQuery(40)).toBe(ZED_WORKSPACES_QUERY);
    });

    it("should return the latest query for unsupported versions with a warning", () => {
      // Even for unsupported versions, we return the latest query
      // The caller should check version support before using results
      expect(getZedWorkspacesQuery(30)).toBe(ZED_WORKSPACES_QUERY);
      expect(getZedWorkspacesQuery(28)).toBe(ZED_WORKSPACES_QUERY);
    });
  });
});
