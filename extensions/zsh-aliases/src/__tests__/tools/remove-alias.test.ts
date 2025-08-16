import { beforeEach, describe, expect, it, vi } from "vitest";
import removeAliasCommand, { confirmation } from "../../tools/remove-alias";
import * as aliasUtils from "../../utils/alias-utils";

// Mock the alias utils
vi.mock("../../utils/alias-utils", () => ({
  removeAlias: vi.fn(),
  parseAliases: vi.fn(),
}));

const mockRemoveAlias = vi.mocked(aliasUtils.removeAlias);
const mockParseAliases = vi.mocked(aliasUtils.parseAliases);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("remove-alias tool", () => {
  describe("confirmation function", () => {
    it("should return confirmation details for existing alias", async () => {
      mockParseAliases.mockReturnValue([{ name: "ll", command: "ls -la", file: ".zshrc" }]);

      const result = await confirmation({ name: "ll" });

      expect(result).toEqual({
        message: "Are you sure you want to remove the alias 'll'?",
        info: [
          { name: "Alias", value: "ll" },
          { name: "Command", value: "ls -la" },
          { name: "File", value: ".zshrc" },
        ],
      });
    });

    it("should return not found message for non-existing alias", async () => {
      mockParseAliases.mockReturnValue([]);

      const result = await confirmation({ name: "nonexistent" });

      expect(result).toEqual({
        message: "Alias 'nonexistent' not found",
      });
    });

    it("should respect config file filter", async () => {
      mockParseAliases.mockReturnValue([{ name: "ll", command: "ls -la", file: ".zshrc" }]);

      const result = await confirmation({ name: "ll", configFile: ".zsh_aliases" });

      expect(result).toEqual({
        message: "Alias 'll' not found in .zsh_aliases",
      });
    });
  });

  describe("removeAliasCommand function", () => {
    it("should remove alias successfully from specified config file", () => {
      mockRemoveAlias.mockReturnValue(true);

      const result = removeAliasCommand({
        name: "ll",
        configFile: ".zshrc",
      });

      expect(result).toEqual({
        success: true,
        message: "Alias 'll' removed successfully from .zshrc",
        aliasName: "ll",
        configFile: ".zshrc",
      });
      expect(mockRemoveAlias).toHaveBeenCalledWith("ll", ".zshrc");
    });

    it("should handle alias not found in specified config file", () => {
      mockRemoveAlias.mockReturnValue(false);

      const result = removeAliasCommand({
        name: "nonexistent",
        configFile: ".zshrc",
      });

      expect(result).toEqual({
        success: false,
        message: "Alias 'nonexistent' not found in .zshrc",
      });
    });

    it("should find and remove alias when no config file specified", () => {
      mockParseAliases.mockReturnValue([{ name: "ll", command: "ls -la", file: ".zshrc" }]);
      mockRemoveAlias.mockReturnValue(true);

      const result = removeAliasCommand({
        name: "ll",
      });

      expect(result).toEqual({
        success: true,
        message: "Alias 'll' removed successfully from .zshrc",
        aliasName: "ll",
        configFile: ".zshrc",
      });
      expect(mockRemoveAlias).toHaveBeenCalledWith("ll", ".zshrc");
    });

    it("should handle alias not found when no config file specified", () => {
      mockParseAliases.mockReturnValue([]);

      const result = removeAliasCommand({
        name: "nonexistent",
      });

      expect(result).toEqual({
        success: false,
        message: "Alias 'nonexistent' not found",
      });
      expect(mockRemoveAlias).not.toHaveBeenCalled();
    });

    it("should handle removal failure", () => {
      mockParseAliases.mockReturnValue([{ name: "ll", command: "ls -la", file: ".zshrc" }]);
      mockRemoveAlias.mockReturnValue(false);

      const result = removeAliasCommand({
        name: "ll",
      });

      expect(result).toEqual({
        success: false,
        message: "Failed to remove alias 'll' from .zshrc",
      });
    });

    it("should handle file system errors", () => {
      mockRemoveAlias.mockImplementation(() => {
        throw new Error("Permission denied");
      });

      const result = removeAliasCommand({
        name: "ll",
        configFile: ".zshrc",
      });

      expect(result).toEqual({
        success: false,
        message: "Failed to remove alias: Permission denied",
      });
    });

    it("should handle unknown errors", () => {
      mockRemoveAlias.mockImplementation(() => {
        throw "String error";
      });

      const result = removeAliasCommand({
        name: "ll",
        configFile: ".zshrc",
      });

      expect(result).toEqual({
        success: false,
        message: "Failed to remove alias: Unknown error",
      });
    });
  });
});
