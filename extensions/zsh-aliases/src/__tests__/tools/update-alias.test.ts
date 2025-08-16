import { describe, it, expect, vi, beforeEach } from "vitest";
import updateAliasCommand, { confirmation } from "../../tools/update-alias";
import * as aliasUtils from "../../utils/alias-utils";

// Mock the alias utils
vi.mock("../../utils/alias-utils", () => ({
  updateAlias: vi.fn(),
  parseAliases: vi.fn(),
  aliasExists: vi.fn(),
  validateAliasName: vi.fn(),
  validateAliasCommand: vi.fn(),
}));

const mockUpdateAlias = vi.mocked(aliasUtils.updateAlias);
const mockParseAliases = vi.mocked(aliasUtils.parseAliases);
const mockAliasExists = vi.mocked(aliasUtils.aliasExists);
const mockValidateAliasName = vi.mocked(aliasUtils.validateAliasName);
const mockValidateAliasCommand = vi.mocked(aliasUtils.validateAliasCommand);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("update-alias tool", () => {
  describe("confirmation function", () => {
    it("should return confirmation details for existing alias update", async () => {
      mockParseAliases.mockReturnValue([{ name: "ll", command: "ls -la", file: ".zshrc" }]);

      const result = await confirmation({
        currentName: "ll",
        newName: "ll",
        newCommand: "ls -lah",
      });

      expect(result).toEqual({
        message: "Are you sure you want to update the command for 'll'?",
        style: "Regular",
        info: [
          { name: "Current Name", value: "ll" },
          { name: "New Name", value: "ll" },
          { name: "Current Command", value: "ls -la" },
          { name: "New Command", value: "ls -lah" },
          { name: "File", value: ".zshrc" },
        ],
      });
    });

    it("should return confirmation details for alias rename", async () => {
      mockParseAliases.mockReturnValue([{ name: "ll", command: "ls -la", file: ".zshrc" }]);

      const result = await confirmation({
        currentName: "ll",
        newName: "list",
        newCommand: "ls -lah",
      });

      expect(result).toEqual({
        message: "Are you sure you want to rename 'll' to 'list' and update its command?",
        style: "Regular",
        info: [
          { name: "Current Name", value: "ll" },
          { name: "New Name", value: "list" },
          { name: "Current Command", value: "ls -la" },
          { name: "New Command", value: "ls -lah" },
          { name: "File", value: ".zshrc" },
        ],
      });
    });

    it("should return not found message for non-existing alias", async () => {
      mockParseAliases.mockReturnValue([]);

      const result = await confirmation({
        currentName: "nonexistent",
        newName: "nonexistent",
        newCommand: "ls -la",
      });

      expect(result).toEqual({
        message: "Alias 'nonexistent' not found",
        style: "Regular",
      });
    });
  });

  describe("updateAliasCommand function", () => {
    beforeEach(() => {
      mockValidateAliasName.mockReturnValue({ isValid: true });
      mockValidateAliasCommand.mockReturnValue({ isValid: true });
    });

    it("should update alias successfully in specified config file", () => {
      mockAliasExists.mockReturnValue(false);

      const result = updateAliasCommand({
        currentName: "ll",
        newName: "ll",
        newCommand: "ls -lah",
        configFile: ".zshrc",
      });

      expect(result).toEqual({
        success: true,
        message: "Alias 'll' updated successfully in .zshrc",
        oldName: "ll",
        newName: "ll",
        configFile: ".zshrc",
      });
      expect(mockUpdateAlias).toHaveBeenCalledWith("ll", "ll", "ls -lah", ".zshrc");
    });

    it("should rename alias successfully in specified config file", () => {
      mockAliasExists.mockReturnValue(false);

      const result = updateAliasCommand({
        currentName: "ll",
        newName: "list",
        newCommand: "ls -lah",
        configFile: ".zshrc",
      });

      expect(result).toEqual({
        success: true,
        message: "Alias 'll' renamed to 'list' and updated in .zshrc",
        oldName: "ll",
        newName: "list",
        configFile: ".zshrc",
      });
      expect(mockUpdateAlias).toHaveBeenCalledWith("ll", "list", "ls -lah", ".zshrc");
    });

    it("should find and update alias when no config file specified", () => {
      mockParseAliases.mockReturnValue([{ name: "ll", command: "ls -la", file: ".zshrc" }]);
      mockAliasExists.mockReturnValue(false);

      const result = updateAliasCommand({
        currentName: "ll",
        newName: "ll",
        newCommand: "ls -lah",
      });

      expect(result).toEqual({
        success: true,
        message: "Alias 'll' updated successfully in .zshrc",
        oldName: "ll",
        newName: "ll",
        configFile: ".zshrc",
      });
      expect(mockUpdateAlias).toHaveBeenCalledWith("ll", "ll", "ls -lah", ".zshrc");
    });

    it("should reject invalid new alias name", () => {
      mockValidateAliasName.mockReturnValue({
        isValid: false,
        error: "Alias name must start with a letter or underscore",
      });

      const result = updateAliasCommand({
        currentName: "ll",
        newName: "1invalid",
        newCommand: "ls -la",
      });

      expect(result).toEqual({
        success: false,
        message: "Alias name must start with a letter or underscore",
      });
      expect(mockUpdateAlias).not.toHaveBeenCalled();
    });

    it("should reject invalid new command", () => {
      mockValidateAliasCommand.mockReturnValue({
        isValid: false,
        error: "Alias command is required",
      });

      const result = updateAliasCommand({
        currentName: "ll",
        newName: "ll",
        newCommand: "",
      });

      expect(result).toEqual({
        success: false,
        message: "Alias command is required",
      });
      expect(mockUpdateAlias).not.toHaveBeenCalled();
    });

    it("should reject rename to existing alias name", () => {
      mockAliasExists.mockReturnValue(true);

      const result = updateAliasCommand({
        currentName: "ll",
        newName: "existing",
        newCommand: "ls -la",
        configFile: ".zshrc",
      });

      expect(result).toEqual({
        success: false,
        message: "Alias 'existing' already exists",
      });
      expect(mockUpdateAlias).not.toHaveBeenCalled();
    });

    it("should handle alias not found when no config file specified", () => {
      mockParseAliases.mockReturnValue([]);

      const result = updateAliasCommand({
        currentName: "nonexistent",
        newName: "nonexistent",
        newCommand: "ls -la",
      });

      expect(result).toEqual({
        success: false,
        message: "Alias 'nonexistent' not found",
      });
      expect(mockUpdateAlias).not.toHaveBeenCalled();
    });

    it("should reject rename to existing alias when no config file specified", () => {
      mockParseAliases.mockReturnValue([{ name: "ll", command: "ls -la", file: ".zshrc" }]);
      mockAliasExists.mockReturnValue(true);

      const result = updateAliasCommand({
        currentName: "ll",
        newName: "existing",
        newCommand: "ls -lah",
      });

      expect(result).toEqual({
        success: false,
        message: "Alias 'existing' already exists",
      });
      expect(mockUpdateAlias).not.toHaveBeenCalled();
    });

    it("should rename alias successfully when auto-finding file", () => {
      mockParseAliases.mockReturnValue([{ name: "ll", command: "ls -la", file: ".zshrc" }]);
      mockAliasExists.mockReturnValue(false);

      const result = updateAliasCommand({
        currentName: "ll",
        newName: "list",
        newCommand: "ls -lah",
      });

      expect(result).toEqual({
        success: true,
        message: "Alias 'll' renamed to 'list' and updated in .zshrc",
        oldName: "ll",
        newName: "list",
        configFile: ".zshrc",
      });
      expect(mockUpdateAlias).toHaveBeenCalledWith("ll", "list", "ls -lah", ".zshrc");
    });

    it("should handle file system errors", () => {
      mockParseAliases.mockReturnValue([{ name: "ll", command: "ls -la", file: ".zshrc" }]);
      mockAliasExists.mockReturnValue(false);
      mockUpdateAlias.mockImplementation(() => {
        throw new Error("Permission denied");
      });

      const result = updateAliasCommand({
        currentName: "ll",
        newName: "ll",
        newCommand: "ls -lah",
      });

      expect(result).toEqual({
        success: false,
        message: "Failed to update alias: Permission denied",
      });
    });

    it("should handle unknown errors", () => {
      mockParseAliases.mockReturnValue([{ name: "ll", command: "ls -la", file: ".zshrc" }]);
      mockAliasExists.mockReturnValue(false);
      mockUpdateAlias.mockImplementation(() => {
        throw "String error";
      });

      const result = updateAliasCommand({
        currentName: "ll",
        newName: "ll",
        newCommand: "ls -lah",
      });

      expect(result).toEqual({
        success: false,
        message: "Failed to update alias: Unknown error",
      });
    });
  });
});
