import { beforeEach, describe, expect, it, vi } from "vitest";
import showAliases from "../../tools/show-aliases";
import * as aliasUtils from "../../utils/alias-utils";

// Mock the alias utils
vi.mock("../../utils/alias-utils", () => ({
  parseAliases: vi.fn(),
}));

const mockParseAliases = vi.mocked(aliasUtils.parseAliases);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("show-aliases tool", () => {
  it("should return empty list when no aliases exist", () => {
    mockParseAliases.mockReturnValue([]);

    const result = showAliases();

    expect(result).toEqual({
      success: true,
      aliases: [],
      total: 0,
      message: "Found 0 aliases",
    });
    expect(mockParseAliases).toHaveBeenCalledTimes(1);
  });

  it("should return single alias correctly", () => {
    const mockAliases = [{ name: "ll", command: "ls -la", file: ".zshrc" }];
    mockParseAliases.mockReturnValue(mockAliases);

    const result = showAliases();

    expect(result).toEqual({
      success: true,
      aliases: mockAliases,
      total: 1,
      message: "Found 1 alias",
    });
    expect(mockParseAliases).toHaveBeenCalledTimes(1);
  });

  it("should return multiple aliases correctly", () => {
    const mockAliases = [
      { name: "ll", command: "ls -la", file: ".zshrc" },
      { name: "grep", command: "grep --color=auto", file: ".zsh_aliases" },
      { name: "cd..", command: "cd ..", file: ".aliases" },
    ];
    mockParseAliases.mockReturnValue(mockAliases);

    const result = showAliases();

    expect(result).toEqual({
      success: true,
      aliases: mockAliases,
      total: 3,
      message: "Found 3 aliases",
    });
    expect(mockParseAliases).toHaveBeenCalledTimes(1);
  });

  it("should handle errors gracefully", () => {
    mockParseAliases.mockImplementation(() => {
      throw new Error("File system error");
    });

    const result = showAliases();

    expect(result).toEqual({
      success: false,
      aliases: [],
      total: 0,
      message: "Failed to list aliases: File system error",
    });
    expect(mockParseAliases).toHaveBeenCalledTimes(1);
  });

  it("should handle unknown errors gracefully", () => {
    mockParseAliases.mockImplementation(() => {
      throw "String error";
    });

    const result = showAliases();

    expect(result).toEqual({
      success: false,
      aliases: [],
      total: 0,
      message: "Failed to list aliases: Unknown error",
    });
    expect(mockParseAliases).toHaveBeenCalledTimes(1);
  });
});
