import { describe, it, expect } from "vitest";
import {
  queryDb,
  getZedWorkspaceDbVersion,
  getZedWorkspacesQuery,
  ZED_WORKSPACES_QUERY_24,
  ZED_WORKSPACES_QUERY_26,
  ZED_WORKSPACES_QUERY_28,
} from "./db";
import { parseZedWorkspace, type ZedWorkspace } from "./workspaces";

describe("Zed DB Integration Tests", () => {
  describe("v28 Schema", () => {
    const dbPath = "test/fixtures/zed-db-v28.sqlite";

    it("should detect correct version", async () => {
      const result = await getZedWorkspaceDbVersion(dbPath);
      expect(result.version).toBe(28);
      expect(result.supported).toBe(true);
    });

    it("should fetch and parse workspaces correctly", async () => {
      const query = getZedWorkspacesQuery(28);
      const output = await queryDb(dbPath, query);
      const rows = output
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => line.split("\t"));

      const zedWorkspaces: ZedWorkspace[] = rows.map((row) => ({
        type: row[0] as "local",
        id: parseInt(row[1], 10),
        paths: row[2],
        timestamp: parseInt(row[3], 10),
        window_id: row[4] ? parseInt(row[4], 10) : null,
        session_id: row[5] || null,
        host: row[6] || undefined,
        user: row[7] || undefined,
        port: row[8] ? parseInt(row[8], 10) : undefined,
      }));

      const parsedWorkspaces = zedWorkspaces
        .map(parseZedWorkspace)
        .filter((ws): ws is NonNullable<typeof ws> => ws !== null);
      expect(parsedWorkspaces).toMatchSnapshot();
    });
  });

  describe("v30 Schema", () => {
    const dbPath = "test/fixtures/zed-db-v30.sqlite";

    it("should detect correct version", async () => {
      const result = await getZedWorkspaceDbVersion(dbPath);
      expect(result.version).toBe(30);
      expect(result.supported).toBe(true);
    });

    it("should fetch and parse workspaces correctly", async () => {
      const query = getZedWorkspacesQuery(30);
      const output = await queryDb(dbPath, query);
      const rows = output
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => line.split("\t"));

      const zedWorkspaces: ZedWorkspace[] = rows.map((row) => ({
        type: row[0] as "local",
        id: parseInt(row[1], 10),
        paths: row[2],
        timestamp: parseInt(row[3], 10),
        window_id: row[4] ? parseInt(row[4], 10) : null,
        session_id: row[5] || null,
        host: row[6] || undefined,
        user: row[7] || undefined,
        port: row[8] ? parseInt(row[8], 10) : undefined,
      }));

      const parsedWorkspaces = zedWorkspaces
        .map(parseZedWorkspace)
        .filter((ws): ws is NonNullable<typeof ws> => ws !== null);
      expect(parsedWorkspaces).toMatchSnapshot();
    });
  });

  describe("Query Selection", () => {
    it("should select v24 query for version 24", () => {
      expect(getZedWorkspacesQuery(24)).toBe(ZED_WORKSPACES_QUERY_24);
    });

    it("should select v26 query for versions 25-26", () => {
      expect(getZedWorkspacesQuery(25)).toBe(ZED_WORKSPACES_QUERY_26);
      expect(getZedWorkspacesQuery(26)).toBe(ZED_WORKSPACES_QUERY_26);
    });

    it("should select v28 query for version 27+", () => {
      expect(getZedWorkspacesQuery(27)).toBe(ZED_WORKSPACES_QUERY_28);
      expect(getZedWorkspacesQuery(28)).toBe(ZED_WORKSPACES_QUERY_28);
      expect(getZedWorkspacesQuery(29)).toBe(ZED_WORKSPACES_QUERY_28);
    });
  });
});
