import { describe, it, expect, vi, beforeEach } from "vitest";
import addAliasCommand from "../../tools/add-alias";
import * as aliasUtils from "../../utils/alias-utils";

// Mock the alias utils
vi.mock("../../utils/alias-utils", () => ({
  validateAliasName: vi.fn(),
  validateAliasCommand: vi.fn(),
  aliasExists: vi.fn(),
  getConfigFiles: vi.fn(),
  addAlias: vi.fn(),
}));

const mockValidateAliasName = vi.mocked(aliasUtils.validateAliasName);
const mockValidateAliasCommand = vi.mocked(aliasUtils.validateAliasCommand);
const mockAliasExists = vi.mocked(aliasUtils.aliasExists);
const mockGetConfigFiles = vi.mocked(aliasUtils.getConfigFiles);
const mockAddAlias = vi.mocked(aliasUtils.addAlias);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetConfigFiles.mockReturnValue([".zshrc", ".zsh_aliases"]);
});

describe("add-alias tool", () => {
  it("should add alias successfully with default config file", () => {
    mockValidateAliasName.mockReturnValue({ isValid: true });
    mockValidateAliasCommand.mockReturnValue({ isValid: true });
    mockAliasExists.mockReturnValue(false);

    const result = addAliasCommand({
      name: "ll",
      command: "ls -la",
    });

    expect(result).toEqual({
      success: true,
      message: "Alias 'll' added successfully to .zshrc",
      aliasName: "ll",
      configFile: ".zshrc",
    });
    expect(mockAddAlias).toHaveBeenCalledWith("ll", "ls -la", ".zshrc");
  });

  it("should add alias successfully with specified config file", () => {
    mockValidateAliasName.mockReturnValue({ isValid: true });
    mockValidateAliasCommand.mockReturnValue({ isValid: true });
    mockAliasExists.mockReturnValue(false);

    const result = addAliasCommand({
      name: "ll",
      command: "ls -la",
      configFile: ".zsh_aliases",
    });

    expect(result).toEqual({
      success: true,
      message: "Alias 'll' added successfully to .zsh_aliases",
      aliasName: "ll",
      configFile: ".zsh_aliases",
    });
    expect(mockAddAlias).toHaveBeenCalledWith("ll", "ls -la", ".zsh_aliases");
  });

  it("should reject invalid alias name", () => {
    mockValidateAliasName.mockReturnValue({
      isValid: false,
      error: "Alias name must start with a letter or underscore",
    });

    const result = addAliasCommand({
      name: "1invalid",
      command: "ls -la",
    });

    expect(result).toEqual({
      success: false,
      message: "Alias name must start with a letter or underscore",
    });
    expect(mockAddAlias).not.toHaveBeenCalled();
  });

  it("should reject invalid alias command", () => {
    mockValidateAliasName.mockReturnValue({ isValid: true });
    mockValidateAliasCommand.mockReturnValue({
      isValid: false,
      error: "Alias command is required",
    });

    const result = addAliasCommand({
      name: "ll",
      command: "",
    });

    expect(result).toEqual({
      success: false,
      message: "Alias command is required",
    });
    expect(mockAddAlias).not.toHaveBeenCalled();
  });

  it("should reject duplicate alias name", () => {
    mockValidateAliasName.mockReturnValue({ isValid: true });
    mockValidateAliasCommand.mockReturnValue({ isValid: true });
    mockAliasExists.mockReturnValue(true);

    const result = addAliasCommand({
      name: "ll",
      command: "ls -la",
    });

    expect(result).toEqual({
      success: false,
      message: "Alias 'll' already exists",
    });
    expect(mockAddAlias).not.toHaveBeenCalled();
  });

  it("should reject invalid config file", () => {
    mockValidateAliasName.mockReturnValue({ isValid: true });
    mockValidateAliasCommand.mockReturnValue({ isValid: true });
    mockAliasExists.mockReturnValue(false);

    const result = addAliasCommand({
      name: "ll",
      command: "ls -la",
      configFile: ".invalid",
    });

    expect(result).toEqual({
      success: false,
      message: "Invalid config file '.invalid'. Must be one of: .zshrc, .zsh_aliases, .aliases",
    });
    expect(mockAddAlias).not.toHaveBeenCalled();
  });

  it("should handle file system errors", () => {
    mockValidateAliasName.mockReturnValue({ isValid: true });
    mockValidateAliasCommand.mockReturnValue({ isValid: true });
    mockAliasExists.mockReturnValue(false);
    mockAddAlias.mockImplementation(() => {
      throw new Error("Permission denied");
    });

    const result = addAliasCommand({
      name: "ll",
      command: "ls -la",
    });

    expect(result).toEqual({
      success: false,
      message: "Failed to add alias: Permission denied",
    });
  });

  it("should handle unknown errors", () => {
    mockValidateAliasName.mockReturnValue({ isValid: true });
    mockValidateAliasCommand.mockReturnValue({ isValid: true });
    mockAliasExists.mockReturnValue(false);
    mockAddAlias.mockImplementation(() => {
      throw "String error";
    });

    const result = addAliasCommand({
      name: "ll",
      command: "ls -la",
    });

    expect(result).toEqual({
      success: false,
      message: "Failed to add alias: Unknown error",
    });
  });

  it("should handle validation without error message for alias name", () => {
    mockValidateAliasName.mockReturnValue({ isValid: false });

    const result = addAliasCommand({
      name: "invalid",
      command: "ls -la",
    });

    expect(result).toEqual({
      success: false,
      message: "Invalid alias name",
    });
    expect(mockAddAlias).not.toHaveBeenCalled();
  });

  it("should handle validation without error message for alias command", () => {
    mockValidateAliasName.mockReturnValue({ isValid: true });
    mockValidateAliasCommand.mockReturnValue({ isValid: false });

    const result = addAliasCommand({
      name: "ll",
      command: "invalid",
    });

    expect(result).toEqual({
      success: false,
      message: "Invalid alias command",
    });
    expect(mockAddAlias).not.toHaveBeenCalled();
  });
});
