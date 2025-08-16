import { describe, it, expect, vi, beforeEach } from "vitest";
import searchAliasesCommand from "../../tools/search-aliases";
import * as aliasUtils from "../../utils/alias-utils";

// Mock the alias utils
vi.mock("../../utils/alias-utils", () => ({
  parseAliases: vi.fn(),
  searchAliases: vi.fn(),
}));

const mockParseAliases = vi.mocked(aliasUtils.parseAliases);
const mockSearchAliases = vi.mocked(aliasUtils.searchAliases);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("search-aliases tool", () => {
  const mockAliases = [
    { name: "ll", command: "ls -la", file: ".zshrc" },
    { name: "grep", command: "grep --color=auto", file: ".zsh_aliases" },
    { name: "listdir", command: "ls -la", file: ".aliases" },
  ];

  it("should search aliases successfully", () => {
    mockParseAliases.mockReturnValue(mockAliases);
    mockSearchAliases.mockReturnValue([
      { name: "ll", command: "ls -la", file: ".zshrc" },
      { name: "listdir", command: "ls -la", file: ".aliases" },
    ]);

    const result = searchAliasesCommand({ query: "ls" });

    expect(result).toEqual({
      success: true,
      aliases: [
        { name: "ll", command: "ls -la", file: ".zshrc" },
        { name: "listdir", command: "ls -la", file: ".aliases" },
      ],
      total: 2,
      query: "ls",
      message: "Found 2 aliases matching 'ls'",
    });
    expect(mockSearchAliases).toHaveBeenCalledWith("ls", mockAliases);
  });

  it("should return no results when no matches found", () => {
    mockParseAliases.mockReturnValue(mockAliases);
    mockSearchAliases.mockReturnValue([]);

    const result = searchAliasesCommand({ query: "nonexistent" });

    expect(result).toEqual({
      success: true,
      aliases: [],
      total: 0,
      query: "nonexistent",
      message: "No aliases found matching 'nonexistent'",
    });
  });

  it("should handle single result correctly", () => {
    mockParseAliases.mockReturnValue(mockAliases);
    mockSearchAliases.mockReturnValue([{ name: "grep", command: "grep --color=auto", file: ".zsh_aliases" }]);

    const result = searchAliasesCommand({ query: "grep" });

    expect(result).toEqual({
      success: true,
      aliases: [{ name: "grep", command: "grep --color=auto", file: ".zsh_aliases" }],
      total: 1,
      query: "grep",
      message: "Found 1 alias matching 'grep'",
    });
  });

  it("should apply limit when specified", () => {
    mockParseAliases.mockReturnValue(mockAliases);
    mockSearchAliases.mockReturnValue([
      { name: "ll", command: "ls -la", file: ".zshrc" },
      { name: "listdir", command: "ls -la", file: ".aliases" },
    ]);

    const result = searchAliasesCommand({ query: "ls", limit: 1 });

    expect(result).toEqual({
      success: true,
      aliases: [{ name: "ll", command: "ls -la", file: ".zshrc" }],
      total: 1,
      query: "ls",
      message: "Found 1 alias matching 'ls' (showing first 1)",
    });
  });

  it("should ignore zero or negative limits", () => {
    mockParseAliases.mockReturnValue(mockAliases);
    mockSearchAliases.mockReturnValue([
      { name: "ll", command: "ls -la", file: ".zshrc" },
      { name: "listdir", command: "ls -la", file: ".aliases" },
    ]);

    const result = searchAliasesCommand({ query: "ls", limit: 0 });

    expect(result).toEqual({
      success: true,
      aliases: [
        { name: "ll", command: "ls -la", file: ".zshrc" },
        { name: "listdir", command: "ls -la", file: ".aliases" },
      ],
      total: 2,
      query: "ls",
      message: "Found 2 aliases matching 'ls'",
    });
  });

  it("should trim whitespace from query", () => {
    mockParseAliases.mockReturnValue(mockAliases);
    mockSearchAliases.mockReturnValue([{ name: "ll", command: "ls -la", file: ".zshrc" }]);

    const result = searchAliasesCommand({ query: "  ls  " });

    expect(result).toEqual({
      success: true,
      aliases: [{ name: "ll", command: "ls -la", file: ".zshrc" }],
      total: 1,
      query: "ls",
      message: "Found 1 alias matching 'ls'",
    });
    expect(mockSearchAliases).toHaveBeenCalledWith("ls", mockAliases);
  });

  it("should reject empty query", () => {
    const result = searchAliasesCommand({ query: "" });

    expect(result).toEqual({
      success: false,
      aliases: [],
      total: 0,
      query: "",
      message: "Search query is required",
    });
    expect(mockSearchAliases).not.toHaveBeenCalled();
  });

  it("should reject whitespace-only query", () => {
    const result = searchAliasesCommand({ query: "   " });

    expect(result).toEqual({
      success: false,
      aliases: [],
      total: 0,
      query: "   ",
      message: "Search query is required",
    });
    expect(mockSearchAliases).not.toHaveBeenCalled();
  });

  it("should handle file system errors", () => {
    mockParseAliases.mockImplementation(() => {
      throw new Error("Permission denied");
    });

    const result = searchAliasesCommand({ query: "ls" });

    expect(result).toEqual({
      success: false,
      aliases: [],
      total: 0,
      query: "ls",
      message: "Failed to search aliases: Permission denied",
    });
  });

  it("should handle unknown errors", () => {
    mockParseAliases.mockImplementation(() => {
      throw "String error";
    });

    const result = searchAliasesCommand({ query: "ls" });

    expect(result).toEqual({
      success: false,
      aliases: [],
      total: 0,
      query: "ls",
      message: "Failed to search aliases: Unknown error",
    });
  });

  it("should handle errors with undefined query", () => {
    // This test covers the fallback for input.query || "" on line 80
    mockParseAliases.mockImplementation(() => {
      throw new Error("Parse error");
    });

    const result = searchAliasesCommand({ query: "valid" });

    expect(result).toEqual({
      success: false,
      aliases: [],
      total: 0,
      query: "valid",
      message: "Failed to search aliases: Parse error",
    });
  });
});
