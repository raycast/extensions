/**
 * Unit tests for parse-zshrc.ts
 *
 * Tests section detection, alias/export parsing, edge cases, and category inference.
 */

import { parseZshrc, toLogicalSections, AliasEntry, ExportEntry } from "../lib/parse-zshrc";
import { getPreferenceValues } from "@raycast/api";
import { vi } from "vitest";

describe("parseZshrc", () => {
  beforeEach(() => {
    // Reset to default preferences for all tests
    vi.mocked(getPreferenceValues).mockReturnValue({
      enableDefaults: true,
      enableCustomHeaderPattern: false,
      enableCustomStartEndPatterns: false,
    });
  });
  describe("section detection", () => {
    it("should detect labeled sections", () => {
      const content = `
# Section: Python
export PATH="/usr/local/bin:$PATH"

# Section: Node
export NODE_PATH="/usr/local/lib/node_modules"
`;

      const entries = parseZshrc(content);
      const pythonEntry = entries.find((e) => e.sectionLabel === "Python");
      const nodeEntry = entries.find((e) => e.sectionLabel === "Node");

      expect(pythonEntry).toBeDefined();
      expect(nodeEntry).toBeDefined();
      expect(pythonEntry?.sectionLabel).toBe("Python");
      expect(nodeEntry?.sectionLabel).toBe("Node");
    });

    it("should detect dashed sections", () => {
      const content = `
# --- Python Config --- #
export PATH="/usr/local/bin:$PATH"

# --- Node Setup --- #
export NODE_PATH="/usr/local/lib/node_modules"
`;

      const entries = parseZshrc(content);
      const pythonEntry = entries.find((e) => e.sectionLabel === "Python Config");
      const nodeEntry = entries.find((e) => e.sectionLabel === "Node Setup");

      expect(pythonEntry).toBeDefined();
      expect(nodeEntry).toBeDefined();
    });

    it("should handle dashed section end markers", () => {
      const content = `
# --- Python Config --- #
export PATH="/usr/local/bin:$PATH"
# --- End Python Config --- #

# Some unlabeled content
alias ll="ls -la"
`;

      const entries = parseZshrc(content);
      const pythonEntry = entries.find((e) => e.sectionLabel === "Python Config");
      const unlabeledEntry = entries.find((e) => e.sectionLabel === undefined);

      expect(pythonEntry).toBeDefined();
      expect(unlabeledEntry).toBeDefined();
      expect(unlabeledEntry?.sectionLabel).toBeUndefined();
    });

    it("should handle case-insensitive section headers", () => {
      const content = `
# section: python
export PATH="/usr/local/bin:$PATH"

# SECTION: NODE
export NODE_PATH="/usr/local/lib/node_modules"
`;

      const entries = parseZshrc(content);
      const pythonEntry = entries.find((e) => e.sectionLabel === "python");
      const nodeEntry = entries.find((e) => e.sectionLabel === "NODE");

      expect(pythonEntry).toBeDefined();
      expect(nodeEntry).toBeDefined();
    });
  });

  describe("alias parsing", () => {
    it("should parse simple aliases", () => {
      const content = `alias ll="ls -la"`;
      const entries = parseZshrc(content);

      expect(entries).toHaveLength(1);
      expect(entries[0]?.type).toBe("alias");

      const aliasEntry = entries[0] as AliasEntry;
      expect(aliasEntry.name).toBe("ll");
      expect(aliasEntry.command).toBe("ls -la");
    });

    it("should parse aliases with single quotes", () => {
      const content = `alias ll='ls -la'`;
      const entries = parseZshrc(content);

      const aliasEntry = entries[0] as AliasEntry;
      expect(aliasEntry.name).toBe("ll");
      expect(aliasEntry.command).toBe("ls -la");
    });

    it("should parse aliases with complex commands", () => {
      const content = `alias gst="git status --porcelain"`;
      const entries = parseZshrc(content);

      const aliasEntry = entries[0] as AliasEntry;
      expect(aliasEntry.name).toBe("gst");
      expect(aliasEntry.command).toBe("git status --porcelain");
    });

    it("should handle aliases with special characters in names", () => {
      const content = `alias g.="git add ."`;
      const entries = parseZshrc(content);

      const aliasEntry = entries[0] as AliasEntry;
      expect(aliasEntry.name).toBe("g.");
      expect(aliasEntry.command).toBe("git add .");
    });

    it("should ignore malformed aliases", () => {
      const content = `
alias ll="ls -la"
alias malformed
alias another="incomplete
`;
      const entries = parseZshrc(content);

      const aliasEntries = entries.filter((e) => e.type === "alias");
      expect(aliasEntries).toHaveLength(1);

      const aliasEntry = aliasEntries[0] as AliasEntry;
      expect(aliasEntry.name).toBe("ll");
    });
  });

  describe("export parsing", () => {
    it("should parse simple exports", () => {
      const content = `export PATH="/usr/local/bin:$PATH"`;
      const entries = parseZshrc(content);

      expect(entries).toHaveLength(1);
      expect(entries[0]?.type).toBe("export");

      const exportEntry = entries[0] as ExportEntry;
      expect(exportEntry.variable).toBe("PATH");
      expect(exportEntry.value).toBe('"/usr/local/bin:$PATH"');
    });

    it("should parse typeset exports", () => {
      const content = `typeset -x PYTHONPATH="/usr/local/lib/python"`;
      const entries = parseZshrc(content);

      const exportEntry = entries[0] as ExportEntry;
      expect(exportEntry.variable).toBe("PYTHONPATH");
      expect(exportEntry.value).toBe('"/usr/local/lib/python"');
    });

    it("should parse exports with complex values", () => {
      const content = `export AWS_PROFILE="default:us-west-2"`;
      const entries = parseZshrc(content);

      const exportEntry = entries[0] as ExportEntry;
      expect(exportEntry.variable).toBe("AWS_PROFILE");
      expect(exportEntry.value).toBe('"default:us-west-2"');
    });

    it("should handle exports with spaces in values", () => {
      const content = `export COMPLEX_VAR="value with spaces"`;
      const entries = parseZshrc(content);

      const exportEntry = entries[0] as ExportEntry;
      expect(exportEntry.variable).toBe("COMPLEX_VAR");
      expect(exportEntry.value).toBe('"value with spaces"');
    });
  });

  describe("line number tracking", () => {
    it("should track correct line numbers", () => {
      const content = `
# Line 2
alias ll="ls -la"
# Line 4
export PATH="/usr/local/bin:$PATH"
# Line 6
`;

      const entries = parseZshrc(content);
      const aliasEntry = entries.find((e) => e.type === "alias") as AliasEntry;
      const exportEntry = entries.find((e) => e.type === "export") as ExportEntry;

      expect(aliasEntry.lineNumber).toBe(3);
      expect(exportEntry.lineNumber).toBe(5);
    });
  });

  describe("edge cases", () => {
    it("should handle empty content", () => {
      const entries = parseZshrc("");
      expect(entries).toHaveLength(0);
    });

    it("should handle content with only whitespace", () => {
      const content = `
   
   
`;
      const entries = parseZshrc(content);
      expect(entries).toHaveLength(0);
    });

    it("should handle content with only comments", () => {
      const content = `
# This is a comment
# Another comment
`;
      const entries = parseZshrc(content);
      expect(entries).toHaveLength(2);
      expect(entries[0]?.type).toBe("other");
      expect(entries[1]?.type).toBe("other");
    });

    it("should handle mixed content", () => {
      const content = `
# Section: Test
alias test="echo test"
export TEST_VAR="test"

# Some other content
function test_func() {
  echo "test"
}
`;

      const entries = parseZshrc(content);
      const aliasEntry = entries.find((e) => e.type === "alias") as AliasEntry;
      const exportEntry = entries.find((e) => e.type === "export") as ExportEntry;
      const otherEntry = entries.find((e) => e.type === "other");

      expect(aliasEntry).toBeDefined();
      expect(exportEntry).toBeDefined();
      expect(otherEntry).toBeDefined();
      expect(aliasEntry.sectionLabel).toBe("Test");
      expect(exportEntry.sectionLabel).toBe("Test");
    });
  });
});

describe("toLogicalSections", () => {
  it("should create logical sections from content", () => {
    const content = `
# Section: Python
export PATH="/usr/local/bin:$PATH"
alias py="python3"

# Section: Node
export NODE_PATH="/usr/local/lib/node_modules"
alias ni="npm install"
`;

    const sections = toLogicalSections(content);
    expect(sections).toHaveLength(3); // Includes empty unlabeled section at start

    const pythonSection = sections.find((s) => s.label === "Python");
    const nodeSection = sections.find((s) => s.label === "Node");

    expect(pythonSection).toBeDefined();
    expect(nodeSection).toBeDefined();
    expect(pythonSection?.aliasCount).toBe(1);
    expect(pythonSection?.exportCount).toBe(1);
    expect(nodeSection?.aliasCount).toBe(1);
    expect(nodeSection?.exportCount).toBe(1);
  });

  it("should merge adjacent unlabeled sections", () => {
    const content = `
alias ll="ls -la"

export PATH="/usr/local/bin:$PATH"

# Section: Python
export PYTHONPATH="/usr/local/lib/python"
`;

    const sections = toLogicalSections(content);
    expect(sections).toHaveLength(2);

    const unlabeledSection = sections.find((s) => s.label === "Unlabeled");
    const pythonSection = sections.find((s) => s.label === "Python");

    expect(unlabeledSection).toBeDefined();
    expect(pythonSection).toBeDefined();
    expect(unlabeledSection?.aliasCount).toBe(1);
    expect(unlabeledSection?.exportCount).toBe(1);
  });

  it("should handle dashed sections with end markers", () => {
    const content = `
# --- Python Config --- #
export PATH="/usr/local/bin:$PATH"
# --- End Python Config --- #

alias ll="ls -la"
`;

    const sections = toLogicalSections(content);
    expect(sections).toHaveLength(3); // Includes empty unlabeled section at start

    const pythonSection = sections.find((s) => s.label === "Python Config");
    const unlabeledSection = sections.find((s) => s.label === "Unlabeled");

    expect(pythonSection).toBeDefined();
    expect(unlabeledSection).toBeDefined();
  });
});
