import { describe, it, expect } from "vitest";
import { replaceFirstScoped } from "../lib/scoped-replace";
import { aliasConfig } from "../edit-alias";
import { exportConfig } from "../edit-export";

const aliasPattern = (name: string) => aliasConfig.generatePattern(name);
const aliasLine = (name: string) => (line: string) => aliasConfig.matchesDisplayLine(line, name);
const exportPattern = (name: string) => exportConfig.generatePattern(name);
const exportLine = (name: string) => (line: string) => exportConfig.matchesDisplayLine(line, name);

const content = [
  "# --- First --- #",
  "alias gs='git status'",
  "",
  "# --- Second --- #",
  "alias gs='git stash'",
  "alias ll='ls -la'",
].join("\n");

describe("replaceFirstScoped", () => {
  it("replaces the occurrence in the named section, not the first file match", () => {
    const { content: updated, found } = replaceFirstScoped(
      content,
      "Second",
      aliasPattern("gs"),
      () => "",
      aliasLine("gs"),
    );
    expect(found).toBe(true);
    expect(updated).toContain("alias gs='git status'"); // First section untouched
    expect(updated).not.toContain("alias gs='git stash'");
  });

  it("replaces the first file match when no section is given", () => {
    const { content: updated, found } = replaceFirstScoped(
      content,
      undefined,
      aliasPattern("gs"),
      () => "",
      aliasLine("gs"),
    );
    expect(found).toBe(true);
    expect(updated).not.toContain("alias gs='git status'");
    expect(updated).toContain("alias gs='git stash'");
  });

  it("falls back to a unique whole-file match when the section cannot be located", () => {
    const { content: updated, found } = replaceFirstScoped(
      content,
      "Nonexistent",
      aliasPattern("ll"),
      () => "",
      aliasLine("ll"),
    );
    expect(found).toBe(true);
    expect(updated).not.toContain("alias ll='ls -la'");
  });

  it("reports found: false without altering content when nothing matches", () => {
    const {
      content: updated,
      found,
      reason,
    } = replaceFirstScoped(content, "First", aliasPattern("nope"), () => "", aliasLine("nope"));
    expect(found).toBe(false);
    expect(reason).toBe("not-found");
    expect(updated).toBe(content);
  });

  it("applies the replacer with the matched line", () => {
    const { content: updated } = replaceFirstScoped(
      content,
      "Second",
      aliasPattern("gs"),
      (line) => line.replace("git stash", "git stash list"),
      aliasLine("gs"),
    );
    expect(updated).toContain("alias gs='git stash list'");
    expect(updated).toContain("alias gs='git status'");
  });

  it("refuses when the section holds several definitions of the name", () => {
    const dup = ["# --- S --- #", "alias x='one'", "alias x='two'"].join("\n");
    const {
      content: updated,
      found,
      reason,
    } = replaceFirstScoped(dup, "S", aliasPattern("x"), () => "", aliasLine("x"));
    expect(found).toBe(false);
    expect(reason).toBe("ambiguous");
    expect(updated).toBe(dup);
  });

  it("refuses when the section cannot be resolved and the name repeats in the file", () => {
    const {
      content: updated,
      found,
      reason,
    } = replaceFirstScoped(content, "Nonexistent", aliasPattern("gs"), () => "", aliasLine("gs"));
    expect(found).toBe(false);
    expect(reason).toBe("ambiguous");
    expect(updated).toBe(content);
  });

  it("removes the line entirely when the replacement is empty", () => {
    const { content: updated } = replaceFirstScoped(content, "Second", aliasPattern("gs"), () => "", aliasLine("gs"));
    expect(updated.split("\n")).toEqual([
      "# --- First --- #",
      "alias gs='git status'",
      "",
      "# --- Second --- #",
      "alias ll='ls -la'",
    ]);
  });

  describe("display parser and write pattern disagreements", () => {
    it("never targets an unquoted alias the UI does not show", () => {
      // parseAliases requires quotes, so only the second line is visible in
      // the UI; the write must target it, not the unquoted first line
      const shadowed = ["# --- Git --- #", "alias g=git", "alias g='git status'"].join("\n");
      const { content: updated, found } = replaceFirstScoped(
        shadowed,
        "Git",
        aliasPattern("g"),
        () => "",
        aliasLine("g"),
      );
      expect(found).toBe(true);
      expect(updated).toContain("alias g=git");
      expect(updated).not.toContain("alias g='git status'");
    });

    it("never targets an empty export the UI does not show", () => {
      const shadowed = ["# --- Env --- #", "export DEBUG=", "export DEBUG=1"].join("\n");
      const { content: updated, found } = replaceFirstScoped(
        shadowed,
        "Env",
        exportPattern("DEBUG"),
        () => "",
        exportLine("DEBUG"),
      );
      expect(found).toBe(true);
      expect(updated).toContain("export DEBUG=");
      expect(updated).not.toContain("export DEBUG=1");
    });

    it("edits only the targeted line even when the previous line has an empty value", () => {
      // A `\s*=\s*` pattern would cross the newline here and swallow both lines
      const tricky = ["# --- Env --- #", "export DEBUG=", "export DEBUG=1"].join("\n");
      const { content: updated, found } = replaceFirstScoped(
        tricky,
        "Env",
        exportPattern("DEBUG"),
        () => "export DEBUG=2",
        exportLine("DEBUG"),
      );
      expect(found).toBe(true);
      expect(updated.split("\n")).toEqual(["# --- Env --- #", "export DEBUG=", "export DEBUG=2"]);
    });

    it("treats regex metacharacters in names as literals", () => {
      // `alias ..` must not match `alias ll` via `..` as a wildcard
      const dots = ["# --- Nav --- #", "alias ll='ls -l'", "alias ..='cd ..'"].join("\n");
      const { content: updated, found } = replaceFirstScoped(
        dots,
        "Nav",
        aliasPattern(".."),
        () => "",
        aliasLine(".."),
      );
      expect(found).toBe(true);
      expect(updated).toContain("alias ll='ls -l'");
      expect(updated).not.toContain("alias ..=");
    });

    it("refuses values containing # instead of splitting them at the comment", () => {
      // The write pattern treats everything after `#` as a comment, so
      // rewriting `alias c='awk #x'` would corrupt it — the display matcher
      // excludes such lines and the call fails closed
      const hash = ["# --- S --- #", "alias c='awk #x'"].join("\n");
      const { content: updated, found } = replaceFirstScoped(hash, "S", aliasPattern("c"), () => "", aliasLine("c"));
      expect(found).toBe(false);
      expect(updated).toBe(hash);
    });

    it("refuses a visible definition the write pattern cannot rewrite", () => {
      // The display predicate accepts the line but the write pattern cannot
      // parse it — fail closed rather than mangle the line
      const text = ["# --- S --- #", "setopt autocd"].join("\n");
      const { found, reason } = replaceFirstScoped(
        text,
        "S",
        aliasPattern("autocd"),
        () => "",
        (line) => line.includes("autocd"),
      );
      expect(found).toBe(false);
      expect(reason).toBe("unsupported");
    });
  });

  describe("duplicate section labels", () => {
    const dupLabels = ["# --- Env --- #", "alias gs='git status'", "", "# --- Env --- #", "alias gs='git stash'"].join(
      "\n",
    );

    it("targets the definition in the second same-labeled section", () => {
      const { content: updated, found } = replaceFirstScoped(
        dupLabels,
        "Env",
        aliasPattern("gs"),
        () => "",
        aliasLine("gs"),
        1, // second instance of the label
      );
      expect(found).toBe(true);
      expect(updated).toContain("alias gs='git status'");
      expect(updated).not.toContain("alias gs='git stash'");
    });

    it("targets the definition in the first same-labeled section by default", () => {
      const { content: updated, found } = replaceFirstScoped(
        dupLabels,
        "Env",
        aliasPattern("gs"),
        () => "",
        aliasLine("gs"),
      );
      expect(found).toBe(true);
      expect(updated).not.toContain("alias gs='git status'");
      expect(updated).toContain("alias gs='git stash'");
    });

    it("refuses when the section instance is missing and the name repeats in the file", () => {
      const {
        content: updated,
        found,
        reason,
      } = replaceFirstScoped(dupLabels, "Env", aliasPattern("gs"), () => "", aliasLine("gs"), 5);
      expect(found).toBe(false);
      expect(reason).toBe("ambiguous");
      expect(updated).toBe(dupLabels);
    });
  });

  describe("line endings", () => {
    it("preserves CRLF line endings", () => {
      const crlf = ["# --- S --- #", "alias a='one'", "alias b='two'"].join("\r\n");
      const { content: updated, found } = replaceFirstScoped(
        crlf,
        "S",
        aliasPattern("a"),
        () => "alias a='uno'",
        aliasLine("a"),
      );
      expect(found).toBe(true);
      expect(updated).toBe(["# --- S --- #", "alias a='uno'", "alias b='two'"].join("\r\n"));
    });
  });
});
