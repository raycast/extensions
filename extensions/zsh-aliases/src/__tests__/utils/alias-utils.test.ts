import { appendFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock fs module
vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  appendFileSync: vi.fn(),
}));

// Mock os module
vi.mock("os", () => ({
  homedir: vi.fn(() => "/mock/home"),
}));

const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockExistsSync = vi.mocked(existsSync);
const mockAppendFileSync = vi.mocked(appendFileSync);
const mockHomedir = vi.mocked(homedir);

// Mock the utility functions for testing
vi.mock("../../utils/alias-utils", async () => {
  const actual = await vi.importActual("../../utils/alias-utils");
  return {
    ...actual,
    parseAliases: vi.fn(),
    getConfigFiles: vi.fn(),
    aliasExists: vi.fn(),
    addAlias: vi.fn(),
    removeAlias: vi.fn(),
    updateAlias: vi.fn(),
    validateAliasName: vi.fn(),
    validateAliasCommand: vi.fn(),
  };
});

// Recreate the utility functions for testing
class TestAliasUtils {
  static parseAliases(): Array<{ name: string; command: string; file: string }> {
    const homeDir = mockHomedir();
    const configFiles = [".zshrc", ".zsh_aliases", ".aliases"];
    const aliases: Array<{ name: string; command: string; file: string }> = [];
    const aliasPattern = /^\s*alias\s+([^=]+)=(['"]?)(.+?)\2\s*$/;

    for (const configFile of configFiles) {
      const filePath = join(homeDir, configFile);
      if (mockExistsSync(filePath)) {
        try {
          const content = mockReadFileSync(filePath, "utf-8") as string;
          const lines = content.split("\n");

          for (const line of lines) {
            const match = line.match(aliasPattern);
            if (match) {
              aliases.push({
                name: match[1].trim(),
                command: match[3].trim(),
                file: configFile,
              });
            }
          }
        } catch (error) {
          console.error(`Error reading ${configFile}:`, error);
        }
      }
    }

    return aliases.sort((a, b) => a.name.localeCompare(b.name));
  }

  static getConfigFiles(): string[] {
    const homeDir = mockHomedir();
    const configFiles = [".zshrc", ".zsh_aliases", ".aliases"];
    const availableFiles: string[] = [];

    for (const configFile of configFiles) {
      const filePath = join(homeDir, configFile);
      if (mockExistsSync(filePath)) {
        availableFiles.push(configFile);
      }
    }

    if (availableFiles.length === 0) {
      availableFiles.push(".zshrc");
    }

    return availableFiles;
  }

  static aliasExists(aliasName: string, excludeFile?: string, excludeName?: string): boolean {
    const homeDir = mockHomedir();
    const configFiles = [".zshrc", ".zsh_aliases", ".aliases"];

    for (const configFile of configFiles) {
      const filePath = join(homeDir, configFile);
      if (mockExistsSync(filePath)) {
        // If we're excluding this specific file and alias name combination, skip this file entirely
        if (excludeFile === configFile && excludeName === aliasName) {
          continue;
        }
        try {
          const content = mockReadFileSync(filePath, "utf-8") as string;
          const aliasPattern = new RegExp(`^\\s*alias\\s+${aliasName}=`, "m");
          if (aliasPattern.test(content)) {
            return true;
          }
        } catch (error) {
          console.error(`Error reading ${configFile}:`, error);
        }
      }
    }
    return false;
  }

  static addAlias(aliasName: string, aliasCommand: string, configFile: string): void {
    const homeDir = mockHomedir();
    const filePath = join(homeDir, configFile);

    const escapedCommand = aliasCommand.replace(/'/g, "'\\''");
    const aliasLine = `alias ${aliasName}='${escapedCommand}'`;

    try {
      if (mockExistsSync(filePath)) {
        const content = mockReadFileSync(filePath, "utf-8") as string;
        const endsWithNewline = content.endsWith("\n");
        const newContent = endsWithNewline ? `${aliasLine}\n` : `\n${aliasLine}\n`;
        mockAppendFileSync(filePath, newContent);
      } else {
        mockWriteFileSync(filePath, `${aliasLine}\n`);
      }
    } catch (error) {
      throw new Error(`Failed to write to ${configFile}: ${error}`);
    }
  }

  static removeAlias(aliasName: string, configFile: string): boolean {
    const homeDir = mockHomedir();
    const filePath = join(homeDir, configFile);

    if (!mockExistsSync(filePath)) {
      throw new Error(`Configuration file ${configFile} not found`);
    }

    try {
      const content = mockReadFileSync(filePath, "utf-8") as string;
      const lines = content.split("\n");
      const aliasPattern = new RegExp(`^\\s*alias\\s+${aliasName}=`);
      let removed = false;

      const newLines = lines.filter((line) => {
        if (aliasPattern.test(line)) {
          removed = true;
          return false;
        }
        return true;
      });

      if (removed) {
        mockWriteFileSync(filePath, newLines.join("\n"));
        return true;
      }

      return false;
    } catch (error) {
      throw new Error(`Failed to remove alias from ${configFile}: ${error}`);
    }
  }

  static updateAlias(oldName: string, newName: string, newCommand: string, configFile: string): void {
    const homeDir = mockHomedir();
    const filePath = join(homeDir, configFile);

    if (!mockExistsSync(filePath)) {
      throw new Error(`Configuration file ${configFile} not found`);
    }

    try {
      const content = mockReadFileSync(filePath, "utf-8") as string;
      const lines = content.split("\n");
      const aliasPattern = new RegExp(`^\\s*alias\\s+${oldName}=(.*)$`);
      let updated = false;

      const newLines = lines.map((line) => {
        const match = line.match(aliasPattern);
        if (match) {
          updated = true;
          const escapedCommand = newCommand.replace(/'/g, "'\\''");
          return `alias ${newName}='${escapedCommand}'`;
        }
        return line;
      });

      if (!updated) {
        throw new Error(`Alias '${oldName}' not found in ${configFile}`);
      }

      mockWriteFileSync(filePath, newLines.join("\n"));
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw error;
      }
      throw new Error(`Failed to update alias in ${configFile}: ${error}`);
    }
  }

  static validateAliasName(name: string): { isValid: boolean; error?: string } {
    if (!name || name.trim() === "") {
      return { isValid: false, error: "Alias name is required" };
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return {
        isValid: false,
        error: "Alias name must start with a letter or underscore and contain only letters, numbers, and underscores",
      };
    }
    return { isValid: true };
  }

  static validateAliasCommand(command: string): { isValid: boolean; error?: string } {
    if (!command || command.trim() === "") {
      return { isValid: false, error: "Alias command is required" };
    }
    return { isValid: true };
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHomedir.mockReturnValue("/mock/home");
});

describe("TestAliasUtils - parseAliases", () => {
  it("should return empty array when no config files exist", () => {
    mockExistsSync.mockReturnValue(false);

    const result = TestAliasUtils.parseAliases();

    expect(result).toEqual([]);
    expect(mockExistsSync).toHaveBeenCalledWith("/mock/home/.zshrc");
    expect(mockExistsSync).toHaveBeenCalledWith("/mock/home/.zsh_aliases");
    expect(mockExistsSync).toHaveBeenCalledWith("/mock/home/.aliases");
  });

  it("should parse valid alias lines correctly", () => {
    mockExistsSync.mockImplementation((path) => {
      const pathStr = String(path);
      return pathStr.includes(".zshrc");
    });
    mockReadFileSync.mockReturnValue(`
      # This is a comment
      alias ll='ls -la'
      alias grep='grep --color=auto'
      export PATH=/usr/local/bin:$PATH
      alias cd..='cd ..'
    `);

    const result = TestAliasUtils.parseAliases();

    expect(result).toHaveLength(3);
    expect(result).toEqual([
      { name: "cd..", command: "cd ..", file: ".zshrc" },
      { name: "grep", command: "grep --color=auto", file: ".zshrc" },
      { name: "ll", command: "ls -la", file: ".zshrc" },
    ]);
  });

  it("should handle aliases with different quote styles", () => {
    mockExistsSync.mockImplementation((path) => {
      const pathStr = String(path);
      return pathStr.includes(".zshrc");
    });
    mockReadFileSync.mockReturnValue(`
      alias single='echo "hello"'
      alias double="echo 'world'"
      alias unquoted=echo test
    `);

    const result = TestAliasUtils.parseAliases();

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ name: "double", command: "echo 'world'", file: ".zshrc" });
    expect(result[1]).toEqual({ name: "single", command: 'echo "hello"', file: ".zshrc" });
    expect(result[2]).toEqual({ name: "unquoted", command: "echo test", file: ".zshrc" });
  });

  it("should handle file read errors gracefully", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation(() => {
      throw new Error("Permission denied");
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = TestAliasUtils.parseAliases();

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith("Error reading .zshrc:", expect.any(Error));

    consoleSpy.mockRestore();
  });

  it("should read from multiple configuration files", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation((path) => {
      const pathStr = String(path);
      if (pathStr.includes(".zsh_aliases")) {
        return "alias zsh_alias='test1'";
      }
      if (pathStr.includes(".aliases")) {
        return "alias generic_alias='test2'";
      }
      return "";
    });

    const result = TestAliasUtils.parseAliases();

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      { name: "generic_alias", command: "test2", file: ".aliases" },
      { name: "zsh_alias", command: "test1", file: ".zsh_aliases" },
    ]);
  });

  it("should sort aliases alphabetically", () => {
    mockExistsSync.mockImplementation((path) => {
      const pathStr = String(path);
      return pathStr.includes(".zshrc");
    });
    mockReadFileSync.mockReturnValue(`
      alias zebra='echo zebra'
      alias apple='echo apple'
      alias banana='echo banana'
    `);

    const result = TestAliasUtils.parseAliases();

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("apple");
    expect(result[1].name).toBe("banana");
    expect(result[2].name).toBe("zebra");
  });
});

describe("TestAliasUtils - getConfigFiles", () => {
  it("should return existing configuration files", () => {
    mockExistsSync.mockImplementation((path) => {
      const pathStr = String(path);
      return pathStr.includes(".zshrc") || pathStr.includes(".zsh_aliases");
    });

    const result = TestAliasUtils.getConfigFiles();

    expect(result).toEqual([".zshrc", ".zsh_aliases"]);
  });

  it("should return .zshrc as default when no files exist", () => {
    mockExistsSync.mockReturnValue(false);

    const result = TestAliasUtils.getConfigFiles();

    expect(result).toEqual([".zshrc"]);
  });

  it("should check all standard config files", () => {
    mockExistsSync.mockReturnValue(true);

    const result = TestAliasUtils.getConfigFiles();

    expect(mockExistsSync).toHaveBeenCalledWith("/mock/home/.zshrc");
    expect(mockExistsSync).toHaveBeenCalledWith("/mock/home/.zsh_aliases");
    expect(mockExistsSync).toHaveBeenCalledWith("/mock/home/.aliases");
    expect(result).toEqual([".zshrc", ".zsh_aliases", ".aliases"]);
  });
});

describe("TestAliasUtils - aliasExists", () => {
  it("should detect existing aliases", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("alias test='echo test'\nalias other='echo other'");

    const existsTest = TestAliasUtils.aliasExists("test");
    const existsOther = TestAliasUtils.aliasExists("other");
    const existsNonexistent = TestAliasUtils.aliasExists("nonexistent");

    expect(existsTest).toBe(true);
    expect(existsOther).toBe(true);
    expect(existsNonexistent).toBe(false);
  });

  it("should handle file read errors", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation(() => {
      throw new Error("Read error");
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = TestAliasUtils.aliasExists("test");

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should exclude files and names when specified", () => {
    mockExistsSync.mockImplementation((path) => {
      const pathStr = String(path);
      return pathStr.includes(".zshrc");
    });
    mockReadFileSync.mockReturnValue("alias test='echo test'");

    const result = TestAliasUtils.aliasExists("test", ".zshrc", "test");

    expect(result).toBe(false);
  });
});

describe("TestAliasUtils - addAlias", () => {
  it("should create new file with alias when file does not exist", () => {
    mockExistsSync.mockReturnValue(false);

    TestAliasUtils.addAlias("test", "echo test", ".zshrc");

    expect(mockWriteFileSync).toHaveBeenCalledWith("/mock/home/.zshrc", "alias test='echo test'\n");
  });

  it("should append to existing file with proper newlines", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("existing content\n");

    TestAliasUtils.addAlias("test", "echo test", ".zshrc");

    expect(mockAppendFileSync).toHaveBeenCalledWith("/mock/home/.zshrc", "alias test='echo test'\n");
  });

  it("should handle files without trailing newline", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("existing content");

    TestAliasUtils.addAlias("test", "echo test", ".zshrc");

    expect(mockAppendFileSync).toHaveBeenCalledWith("/mock/home/.zshrc", "\nalias test='echo test'\n");
  });

  it("should escape single quotes in commands", () => {
    mockExistsSync.mockReturnValue(false);

    TestAliasUtils.addAlias("test", "echo 'test'", ".zshrc");

    expect(mockWriteFileSync).toHaveBeenCalledWith("/mock/home/.zshrc", "alias test='echo '\\''test'\\'''\n");
  });
});

describe("TestAliasUtils - removeAlias", () => {
  it("should throw error when file does not exist", () => {
    mockExistsSync.mockReturnValue(false);

    expect(() => TestAliasUtils.removeAlias("test", ".zshrc")).toThrow("Configuration file .zshrc not found");
  });

  it("should remove existing alias and return true", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("\nalias test='command'\nalias other='other command'\n");

    const result = TestAliasUtils.removeAlias("test", ".zshrc");

    expect(result).toBe(true);
    expect(mockWriteFileSync).toHaveBeenCalledWith("/mock/home/.zshrc", "\nalias other='other command'\n");
  });

  it("should return false when alias not found", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("alias other='command'");

    const result = TestAliasUtils.removeAlias("nonexistent", ".zshrc");

    expect(result).toBe(false);
  });
});

describe("TestAliasUtils - updateAlias", () => {
  it("should throw error when file does not exist", () => {
    mockExistsSync.mockReturnValue(false);

    expect(() => TestAliasUtils.updateAlias("old", "new", "command", ".zshrc")).toThrow(
      "Configuration file .zshrc not found",
    );
  });

  it("should update existing alias correctly", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("alias test='old command'\nalias other='other command'");

    TestAliasUtils.updateAlias("test", "test", "new command", ".zshrc");

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      "/mock/home/.zshrc",
      "alias test='new command'\nalias other='other command'",
    );
  });

  it("should handle alias renaming", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("alias old_name='command'");

    TestAliasUtils.updateAlias("old_name", "new_name", "command", ".zshrc");

    expect(mockWriteFileSync).toHaveBeenCalledWith("/mock/home/.zshrc", "alias new_name='command'");
  });

  it("should throw error when alias not found", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("alias other='command'");

    expect(() => TestAliasUtils.updateAlias("nonexistent", "new", "command", ".zshrc")).toThrow(
      "Alias 'nonexistent' not found in .zshrc",
    );
  });
});

describe("TestAliasUtils - validation", () => {
  describe("validateAliasName", () => {
    it("should reject empty names", () => {
      expect(TestAliasUtils.validateAliasName("").isValid).toBe(false);
      expect(TestAliasUtils.validateAliasName("   ").isValid).toBe(false);
    });

    it("should reject names starting with numbers", () => {
      expect(TestAliasUtils.validateAliasName("1test").isValid).toBe(false);
    });

    it("should reject names with special characters", () => {
      expect(TestAliasUtils.validateAliasName("test-alias").isValid).toBe(false);
      expect(TestAliasUtils.validateAliasName("test.alias").isValid).toBe(false);
      expect(TestAliasUtils.validateAliasName("test@alias").isValid).toBe(false);
    });

    it("should accept valid names", () => {
      expect(TestAliasUtils.validateAliasName("test").isValid).toBe(true);
      expect(TestAliasUtils.validateAliasName("test_alias").isValid).toBe(true);
      expect(TestAliasUtils.validateAliasName("_test").isValid).toBe(true);
      expect(TestAliasUtils.validateAliasName("test123").isValid).toBe(true);
    });
  });

  describe("validateAliasCommand", () => {
    it("should reject empty commands", () => {
      expect(TestAliasUtils.validateAliasCommand("").isValid).toBe(false);
      expect(TestAliasUtils.validateAliasCommand("   ").isValid).toBe(false);
    });

    it("should accept valid commands", () => {
      expect(TestAliasUtils.validateAliasCommand("ls -la").isValid).toBe(true);
      expect(TestAliasUtils.validateAliasCommand('echo "hello world"').isValid).toBe(true);
    });
  });
});
