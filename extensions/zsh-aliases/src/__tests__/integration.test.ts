import { describe, it, expect } from "vitest";
import * as showAliases from "../tools/show-aliases";
import * as addAlias from "../tools/add-alias";
import * as removeAlias from "../tools/remove-alias";
import * as updateAlias from "../tools/update-alias";
import * as searchAliases from "../tools/search-aliases";

/**
 * Integration tests that use the real tool functions without mocks.
 * These tests exercise the actual utility functions to improve coverage.
 *
 * Note: These tests use the actual file system, so they may fail if
 * the user's actual alias files have unexpected content or permissions.
 */
describe("Integration tests - Real tools", () => {
  describe("showAliases integration", () => {
    it("should execute without throwing errors", () => {
      expect(() => {
        const result = showAliases.default();
        expect(typeof result).toBe("object");
        expect(typeof result.success).toBe("boolean");
        expect(Array.isArray(result.aliases)).toBe(true);
        expect(typeof result.total).toBe("number");
        expect(typeof result.message).toBe("string");
      }).not.toThrow();
    });
  });

  describe("searchAliases integration", () => {
    it("should handle valid search without throwing", () => {
      expect(() => {
        const result = searchAliases.default({ query: "test_unlikely_to_exist_12345" });
        expect(typeof result).toBe("object");
        expect(typeof result.success).toBe("boolean");
        expect(Array.isArray(result.aliases)).toBe(true);
        expect(typeof result.total).toBe("number");
        expect(typeof result.query).toBe("string");
        expect(typeof result.message).toBe("string");
      }).not.toThrow();
    });

    it("should reject empty query", () => {
      const result = searchAliases.default({ query: "" });
      expect(result.success).toBe(false);
      expect(result.message).toBe("Search query is required");
    });
  });

  describe("addAlias integration", () => {
    it("should validate input properly", () => {
      // Test with invalid name
      const result1 = addAlias.default({
        name: "1invalid",
        command: "echo test",
      });
      expect(result1.success).toBe(false);
      expect(result1.message).toContain("name");

      // Test with empty command
      const result2 = addAlias.default({
        name: "valid_name",
        command: "",
      });
      expect(result2.success).toBe(false);
      expect(result2.message).toContain("command");
    });
  });

  describe("removeAlias integration", () => {
    it("should handle non-existent alias", () => {
      const result = removeAlias.default({
        name: "definitely_does_not_exist_12345",
        configFile: ".zshrc",
      });
      // Should not throw, will either succeed (if file doesn't exist) or fail gracefully
      expect(typeof result).toBe("object");
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.message).toBe("string");
    });
  });

  describe("updateAlias integration", () => {
    it("should validate input properly", () => {
      // Test with invalid new name
      const result1 = updateAlias.default({
        currentName: "test",
        newName: "1invalid",
        newCommand: "echo test",
        configFile: ".zshrc",
      });
      expect(result1.success).toBe(false);
      expect(result1.message).toContain("name");

      // Test with empty command
      const result2 = updateAlias.default({
        currentName: "test",
        newName: "valid_name",
        newCommand: "",
        configFile: ".zshrc",
      });
      expect(result2.success).toBe(false);
      expect(result2.message).toContain("command");
    });

    it("should handle non-existent alias", () => {
      const result = updateAlias.default({
        currentName: "definitely_does_not_exist_12345",
        newName: "new_name",
        newCommand: "echo test",
        configFile: ".zshrc",
      });
      // Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });
  });

  describe("confirmation functions", () => {
    it("should handle removeAlias confirmation", async () => {
      const result = await removeAlias.confirmation({ name: "test_alias" });
      expect(typeof result).toBe("object");
      expect(typeof result.message).toBe("string");
    });

    it("should handle updateAlias confirmation", async () => {
      const result = await updateAlias.confirmation({
        currentName: "test",
        newName: "new_test",
        newCommand: "echo hello",
      });
      expect(typeof result).toBe("object");
      expect(typeof result.message).toBe("string");
    });
  });
});
