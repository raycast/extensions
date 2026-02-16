/**
 * Tests for validation.ts - Validation utilities for zshrc content
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { homedir } from "node:os";
import {
  detectDuplicates,
  detectBrokenSources,
  validateStructure,
  validateAliasCommand,
  validateExportValue,
  type DuplicateResult,
  type BrokenSourceResult,
} from "../utils/validation";

describe("validation.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("detectDuplicates", () => {
    it("should return empty result for no duplicates", () => {
      const items = [
        { name: "alias1", section: "General" },
        { name: "alias2", section: "General" },
        { name: "alias3", section: "Git" },
      ];

      const result = detectDuplicates(items, "name");

      expect(result.duplicates).toHaveLength(0);
      expect(result.totalDuplicates).toBe(0);
    });

    it("should detect duplicates with same name", () => {
      const items = [
        { name: "ll", section: "General" },
        { name: "ll", section: "Aliases" },
        { name: "gs", section: "Git" },
      ];

      const result = detectDuplicates(items, "name");

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0]!.name).toBe("ll");
      expect(result.duplicates[0]!.count).toBe(2);
      expect(result.duplicates[0]!.sections).toContain("General");
      expect(result.duplicates[0]!.sections).toContain("Aliases");
    });

    it("should count total duplicates correctly", () => {
      const items = [
        { name: "a", section: "S1" },
        { name: "a", section: "S2" },
        { name: "a", section: "S3" },
        { name: "b", section: "S1" },
        { name: "b", section: "S2" },
      ];

      const result = detectDuplicates(items, "name");

      // a appears 3 times (2 extra), b appears 2 times (1 extra) = 3 total
      expect(result.totalDuplicates).toBe(3);
    });

    it("should work with different key fields", () => {
      const items = [
        { variable: "PATH", section: "Env" },
        { variable: "PATH", section: "Export" },
        { variable: "HOME", section: "Env" },
      ];

      const result = detectDuplicates(items, "variable");

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0]!.name).toBe("PATH");
    });

    it("should handle items without section", () => {
      const items: { name: string; section?: string }[] = [{ name: "test" }, { name: "test" }];

      const result = detectDuplicates(items, "name");

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0]!.sections).toContain("Unknown");
    });

    it("should handle empty input", () => {
      const result = detectDuplicates([], "name");

      expect(result.duplicates).toHaveLength(0);
      expect(result.totalDuplicates).toBe(0);
    });

    it("should handle single item", () => {
      const items = [{ name: "single", section: "Test" }];
      const result = detectDuplicates(items, "name");

      expect(result.duplicates).toHaveLength(0);
    });

    it("should track unique sections for duplicates", () => {
      const items = [
        { name: "test", section: "Section1" },
        { name: "test", section: "Section1" }, // Same section twice
        { name: "test", section: "Section2" },
      ];

      const result = detectDuplicates(items, "name");

      expect(result.duplicates[0]!.count).toBe(3);
      expect(result.duplicates[0]!.sections).toHaveLength(2); // Unique sections
    });

    it("should handle multiple different duplicates", () => {
      const items = [
        { name: "a", section: "S1" },
        { name: "a", section: "S2" },
        { name: "b", section: "S1" },
        { name: "b", section: "S3" },
        { name: "c", section: "S1" },
      ];

      const result = detectDuplicates(items, "name");

      expect(result.duplicates).toHaveLength(2);
      expect(result.duplicates.map((d) => d.name).sort()).toEqual(["a", "b"]);
    });
  });

  describe("detectBrokenSources", () => {
    const home = homedir();

    it("should skip paths with unresolved variables", async () => {
      // Paths with unresolved variables should be skipped
      const sources = [{ path: "$CUSTOM_VAR/file.zsh", section: "Custom" }];

      const result = await detectBrokenSources(sources);

      // Should not report as broken since it's skipped
      expect(result.brokenSources).toHaveLength(0);
    });

    it("should handle empty input", async () => {
      const result = await detectBrokenSources([]);

      expect(result.brokenSources).toHaveLength(0);
      expect(result.totalBroken).toBe(0);
    });

    it("should detect nonexistent files as broken", async () => {
      // Use a path that definitely doesn't exist
      const sources = [
        {
          path: "/this/path/definitely/does/not/exist/on/any/system.zsh",
          section: "Test",
        },
      ];

      const result = await detectBrokenSources(sources);

      expect(result.brokenSources).toHaveLength(1);
      expect(result.totalBroken).toBe(1);
      expect(result.brokenSources[0]!.section).toBe("Test");
    });

    it("should expand ~ in paths before checking", async () => {
      // Use a nonexistent path with ~
      const sources = [
        {
          path: "~/.this_file_definitely_does_not_exist_zshrc_test",
          section: "Test",
        },
      ];

      const result = await detectBrokenSources(sources);

      // Should be broken (file doesn't exist)
      expect(result.brokenSources).toHaveLength(1);
      // Should have expanded ~ to home directory
      expect(result.brokenSources[0]!.expandedPath).toBe(`${home}/.this_file_definitely_does_not_exist_zshrc_test`);
      expect(result.brokenSources[0]!.path).toBe("~/.this_file_definitely_does_not_exist_zshrc_test");
    });

    it("should expand $HOME in paths before checking", async () => {
      const sources = [
        {
          path: "$HOME/.this_file_definitely_does_not_exist_zshrc_test",
          section: "Test",
        },
      ];

      const result = await detectBrokenSources(sources);

      expect(result.brokenSources).toHaveLength(1);
      expect(result.brokenSources[0]!.expandedPath).toBe(`${home}/.this_file_definitely_does_not_exist_zshrc_test`);
    });

    it("should handle multiple broken sources", async () => {
      const sources = [
        { path: "/nonexistent/path1", section: "Section1" },
        { path: "/nonexistent/path2", section: "Section2" },
        { path: "/nonexistent/path3", section: "Section3" },
      ];

      const result = await detectBrokenSources(sources);

      expect(result.brokenSources).toHaveLength(3);
      expect(result.totalBroken).toBe(3);
    });

    it("should handle sources without section field", async () => {
      const sources = [{ path: "/nonexistent/file" }];

      const result = await detectBrokenSources(sources);

      expect(result.brokenSources[0]!.section).toBe("Unknown");
    });
  });

  describe("type interfaces", () => {
    it("DuplicateResult should have correct structure", () => {
      const result: DuplicateResult = {
        duplicates: [{ name: "test", count: 2, sections: ["A", "B"] }],
        totalDuplicates: 1,
      };

      expect(result.duplicates).toBeDefined();
      expect(result.totalDuplicates).toBeDefined();
    });

    it("BrokenSourceResult should have correct structure", () => {
      const result: BrokenSourceResult = {
        brokenSources: [{ path: "~/test", section: "Test", expandedPath: "/home/user/test" }],
        totalBroken: 1,
      };

      expect(result.brokenSources).toBeDefined();
      expect(result.totalBroken).toBeDefined();
    });
  });

  describe("validateStructure", () => {
    it("should return valid for balanced quotes", () => {
      const result = validateStructure('"hello world"');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should warn about unbalanced double quotes", () => {
      const result = validateStructure('"hello');

      expect(result.isValid).toBe(true); // Warning, not error
      expect(result.warnings).toContain("Unbalanced double quotes detected");
    });

    it("should warn about unbalanced single quotes", () => {
      const result = validateStructure("'hello");

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Unbalanced single quotes detected");
    });

    it("should warn about unbalanced backticks", () => {
      const result = validateStructure("`hello");

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Unbalanced backticks detected");
    });

    it("should warn about unbalanced parentheses", () => {
      const result = validateStructure("(hello");

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Unbalanced parentheses detected");
    });

    it("should warn about unbalanced brackets", () => {
      const result = validateStructure("[hello");

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Unbalanced brackets detected");
    });

    it("should warn about unbalanced braces", () => {
      const result = validateStructure("{hello");

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Unbalanced braces detected");
    });

    it("should detect multiple unbalanced structures", () => {
      const result = validateStructure('"(hello]');

      expect(result.warnings.length).toBeGreaterThan(1);
      expect(result.warnings).toContain("Unbalanced double quotes detected");
      expect(result.warnings).toContain("Unbalanced parentheses detected");
      expect(result.warnings).toContain("Unbalanced brackets detected");
    });

    it("should warn about \\n without $' syntax", () => {
      const result = validateStructure('echo "hello\\nworld"');

      expect(result.warnings).toContain("Contains \\n - use $'...' syntax for literal newlines");
    });

    it("should not warn about \\n with $' syntax", () => {
      const result = validateStructure("$'hello\\nworld'");

      expect(result.warnings).not.toContain("Contains \\n - use $'...' syntax for literal newlines");
    });

    it("should handle empty string", () => {
      const result = validateStructure("");

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should handle complex balanced expression", () => {
      const result = validateStructure('echo "$(command `nested`)" | grep "[a-z]" && (true || false)');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("validateAliasCommand", () => {
    it("should return valid for normal commands", () => {
      const result = validateAliasCommand("ls -la");

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should warn when command starts with 'alias '", () => {
      const result = validateAliasCommand("alias ls -la");

      expect(result.warnings).toContain("Command should not start with 'alias' - just provide the command");
    });

    it("should warn about rm -rf with root path", () => {
      const result = validateAliasCommand("rm -rf /");

      expect(result.warnings).toContain("Potentially dangerous rm command with root or home path");
    });

    it("should warn about rm -rf with home path", () => {
      const result = validateAliasCommand("rm -rf ~");

      expect(result.warnings).toContain("Potentially dangerous rm command with root or home path");
    });

    it("should warn about rm -r with root path", () => {
      const result = validateAliasCommand("rm -r /");

      expect(result.warnings).toContain("Potentially dangerous rm command with root or home path");
    });

    it("should not warn about rm -rf with safe paths", () => {
      const result = validateAliasCommand("rm -rf ./build");

      expect(result.warnings).not.toContain("Potentially dangerous rm command with root or home path");
    });

    it("should include structural validation warnings", () => {
      const result = validateAliasCommand('echo "unbalanced');

      expect(result.warnings).toContain("Unbalanced double quotes detected");
    });

    it("should handle complex but safe commands", () => {
      const result = validateAliasCommand('git log --oneline | head -10 | grep "fix"');

      expect(result.isValid).toBe(true);
    });

    it("should handle empty command", () => {
      const result = validateAliasCommand("");

      expect(result.isValid).toBe(true);
    });
  });

  describe("validateExportValue", () => {
    it("should return valid for normal values", () => {
      const result = validateExportValue("/usr/local/bin");

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should warn about PATH duplication pattern", () => {
      const result = validateExportValue("/usr/bin:$PATH:/another/path:$PATH:");

      expect(result.warnings).toContain("$PATH appears multiple times in value - possible duplication");
    });

    it("should not warn about single $PATH reference", () => {
      const result = validateExportValue("/usr/bin:$PATH");

      expect(result.warnings).not.toContain("$PATH appears multiple times in value - possible duplication");
    });

    it("should include structural validation warnings", () => {
      const result = validateExportValue('"/usr/bin');

      expect(result.warnings).toContain("Unbalanced double quotes detected");
    });

    it("should handle complex PATH values", () => {
      const result = validateExportValue("$HOME/bin:$HOME/.local/bin:/usr/local/bin:$PATH");

      expect(result.isValid).toBe(true);
    });

    it("should handle empty value", () => {
      const result = validateExportValue("");

      expect(result.isValid).toBe(true);
    });

    it("should handle values with nested variable expansions", () => {
      const result = validateExportValue("${HOME:-/root}/.config");

      expect(result.isValid).toBe(true);
    });
  });
});
