/**
 * Parser-unification guarantees.
 *
 * Every surface — type views, statistics, sections, search — derives from
 * the single pattern registry. These tests hold the three invariants the
 * unification promises:
 *
 * 1. Property: every entry any view surfaces appears in the registry
 *    output exactly once (per type), on a corpus of real-world constructs.
 * 2. Golden count: statistics counts equal the per-type view counts on
 *    the same fixture.
 * 3. Occurrence targeting: identical definitions in same-labeled section
 *    instances are addressed individually by the write path, and two
 *    identical definitions inside ONE section are refused rather than
 *    guessed at.
 */

import { describe, it, expect } from "vitest";
import { extractEntries, countAllPatterns, countUnrecognizedLines, tokenizeArrayBody } from "../lib/pattern-registry";
import { parseZshrc, toLogicalSections } from "../lib/parse-zshrc";
import { calculateStatistics } from "../utils/statistics";
import { replaceFirstScoped } from "../lib/scoped-replace";
import {
  parseAliases,
  parseExports,
  parseEvals,
  parseSetopts,
  parsePlugins,
  parseFunctions,
  parseSources,
  parsePathEntries,
  parseFpathEntries,
  parseKeybindings,
} from "../utils/parsers";

/**
 * Corpus of real-world constructs, exercising every deliberate
 * unification decision: dual export/PATH surfacing, multi-line plugin
 * arrays, typeset/declare and += PATH forms, quoted source operands with
 * trailing comments, structured keybindings, and constructs that must
 * NOT be parsed (unquoted alias values, bare bindkey mode flags).
 */
const CORPUS = `# Section: Core
alias ll='ls -la'
alias gs="git status"
alias broken=unquoted-value-is-not-parsed
export EDITOR=vim
export PATH="/usr/local/bin:$PATH"
typeset -x PATH="/custom/bin:$PATH"
PATH+=:/appended/bin
path+=(/array/one /array/two)

# Section: Shell
setopt HIST_IGNORE_DUPS
eval "$(rbenv init -)"
my_func() {
  echo hi
}
source "/opt/with space/file.zsh" # trailing comment
source ~/.zshrc.local
fpath=(~/.zsh/functions)

# Section: OMZ
plugins=(
  git
  docker
)
ZSH_THEME="robbyrussell"
autoload -Uz compinit
compinit
HISTSIZE=10000
bindkey '^R' history-incremental-search-backward
bindkey -M viins 'jj' vi-cmd-mode
bindkey -e
`;

describe("parser unification", () => {
  describe("property: view entries appear in registry output exactly once", () => {
    const sections = toLogicalSections(CORPUS);
    // Views parse section content, so the registry is compared over the
    // same domain. (Top-level `name() {` lines are section BOUNDARIES,
    // excluded from every section's content — tested separately below.)
    const sectionContent = sections.map((s) => s.content).join("\n");
    const registry = extractEntries(sectionContent);

    /** Aggregate a view parser over sections, the way views consume it. */
    const viaSections = <T>(parse: (content: string) => ReadonlyArray<T>): T[] =>
      sections.flatMap((section) => [...parse(section.content)]);

    it.each([
      ["aliases", () => viaSections(parseAliases), () => registry.aliases, (e: { name: string }) => e.name],
      ["exports", () => viaSections(parseExports), () => registry.exports, (e: { variable: string }) => e.variable],
      ["evals", () => viaSections(parseEvals), () => registry.evals, (e: { command: string }) => e.command],
      ["setopts", () => viaSections(parseSetopts), () => registry.setopts, (e: { option: string }) => e.option],
      ["plugins", () => viaSections(parsePlugins), () => registry.plugins, (e: { name: string }) => e.name],
      [
        "functions",
        // Indented function definitions are view-visible; top-level ones
        // become sections (see the dedicated test below)
        () => viaSections(parseFunctions),
        () => registry.functions,
        (e: { name: string }) => e.name,
      ],
      ["sources", () => viaSections(parseSources), () => registry.sources, (e: { path: string }) => e.path],
      [
        "pathEntries",
        () => viaSections(parsePathEntries),
        () => registry.pathEntries,
        (e: { entry: string }) => e.entry,
      ],
      [
        "fpathEntries",
        () => viaSections(parseFpathEntries),
        () => registry.fpathEntries,
        (e: { entry: string }) => e.entry,
      ],
      ["keybindings", () => viaSections(parseKeybindings), () => registry.keybindings, (e: { key: string }) => e.key],
    ] as const)("%s", (type, view, fromRegistry, keyOf) => {
      const viewKeys = view().map((e) => keyOf(e as never));
      const registryKeys = fromRegistry().map((e) => keyOf(e as never));
      // Same multiset: every view entry present in registry output exactly once
      expect(viewKeys.slice().sort()).toEqual(registryKeys.slice().sort());
      if (type !== "functions") {
        expect(viewKeys.length).toBeGreaterThan(0);
      }
    });

    it("extracts the corpus's ground-truth entries (independent of any projection)", () => {
      // Hardcoded expectations: unlike the multiset comparisons above
      // (which are projections of the same extraction), these fail if the
      // registry itself drops or invents entries.
      const wholeFile = extractEntries(CORPUS);
      expect(wholeFile.aliases.map((a) => a.name).sort()).toEqual(["gs", "ll"]);
      expect(wholeFile.plugins.map((p) => p.name).sort()).toEqual(["docker", "git"]);
      expect(wholeFile.sources.map((s) => s.path).sort()).toEqual(['"/opt/with space/file.zsh"', "~/.zshrc.local"]);
      expect(wholeFile.pathEntries.map((p) => `${p.type}:${p.entry}`).sort()).toEqual([
        "append:/appended/bin",
        "append:/array/one",
        "append:/array/two",
        "export:/custom/bin:$PATH",
        "export:/usr/local/bin:$PATH",
      ]);
      expect(wholeFile.fpathEntries.map((f) => f.entry)).toEqual(["~/.zsh/functions"]);
      expect(wholeFile.keybindings.map((k) => k.key).sort()).toEqual(["^R", "jj"]);
      expect(wholeFile.exports.map((e) => e.variable).sort()).toEqual(["EDITOR", "PATH", "PATH"]);
      expect(wholeFile.setopts.map((s) => s.option)).toEqual(["HIST_IGNORE_DUPS"]);
      expect(wholeFile.themes.map((t) => t.name)).toEqual(["robbyrussell"]);
      expect(wholeFile.autoloads.map((a) => a.function)).toEqual(["compinit"]);
    });

    it("top-level function definitions become sections, not view entries", () => {
      // Deliberate, pre-existing behavior kept by the unification:
      // `my_func() {` at section level is a function-style section marker.
      // No view lists it as an entry; it navigates as a section instead.
      const labels = sections.map((s) => s.label);
      expect(labels).toContain("my_func");
      expect(viaSections(parseFunctions).some((f) => f.name === "my_func")).toBe(false);
      // The registry still extracts it from raw (whole-file) content for
      // whole-file surfaces:
      expect(
        extractEntries(CORPUS)
          .functions.map((f) => f.name)
          .sort(),
      ).toEqual(["my_func"]);
    });

    it("registry entries carry their line position", () => {
      for (const collection of Object.values(registry)) {
        for (const entry of collection) {
          expect(entry.line).toBeGreaterThan(0);
        }
      }
      // Spot check against whole-file extraction: the multi-line plugins
      // array is attributed to its opening line
      const wholeFile = extractEntries(CORPUS);
      const gitPlugin = wholeFile.plugins.find((p) => p.name === "git");
      const corpusLines = CORPUS.split("\n");
      expect(corpusLines[gitPlugin!.line - 1]).toContain("plugins=(");
    });

    it("deliberately unparsed constructs appear on no surface", () => {
      // Unquoted alias values are excluded everywhere (write-path safety)
      expect(registry.aliases.some((a) => a.name === "broken")).toBe(false);
      expect(viaSections(parseAliases).some((a) => a.name === "broken")).toBe(false);
      // Bare bindkey mode flags have nothing to show and count nowhere
      expect(registry.keybindings.some((k) => k.key === "-e")).toBe(false);
      // parseZshrc types them as OTHER rather than inventing an entry
      const entries = parseZshrc(CORPUS);
      const bindkeyE = entries.find((e) => e.originalLine.trim() === "bindkey -e");
      expect(bindkeyE?.type).toBe("other");
    });
  });

  // These are CONSISTENCY tests, not correctness tests: both sides of
  // every assertion project from extractEntries, so they prove the
  // surfaces are wired to one parser (the point of the unification), not
  // that the parser extracts the right things. Extraction correctness is
  // covered by the hardcoded ground-truth assertions elsewhere in this
  // file ("extracts the corpus's ground-truth entries", the keybinding
  // form tests, and the tokenizer tests).
  describe("golden count: statistics equal view counts", () => {
    it("calculateStatistics agrees with each view on the same fixture", () => {
      const sections = toLogicalSections(CORPUS);
      const stats = calculateStatistics(sections);

      expect(stats.aliases.length).toBe(sections.flatMap((s) => [...parseAliases(s.content)]).length);
      expect(stats.exports.length).toBe(sections.flatMap((s) => [...parseExports(s.content)]).length);
      expect(stats.evals.length).toBe(sections.flatMap((s) => [...parseEvals(s.content)]).length);
      expect(stats.setopts.length).toBe(sections.flatMap((s) => [...parseSetopts(s.content)]).length);
      expect(stats.plugins.length).toBe(sections.flatMap((s) => [...parsePlugins(s.content)]).length);
      expect(stats.functions.length).toBe(sections.flatMap((s) => [...parseFunctions(s.content)]).length);
      expect(stats.sources.length).toBe(sections.flatMap((s) => [...parseSources(s.content)]).length);
    });

    it("section counts equal view counts per type", () => {
      for (const section of toLogicalSections(CORPUS)) {
        expect(section.aliasCount).toBe(parseAliases(section.content).length);
        expect(section.exportCount).toBe(parseExports(section.content).length);
        expect(section.pluginCount).toBe(parsePlugins(section.content).length);
        expect(section.sourceCount).toBe(parseSources(section.content).length);
        expect(section.pathCount).toBe(parsePathEntries(section.content).length);
        expect(section.fpathCount).toBe(parseFpathEntries(section.content).length);
        expect(section.keybindingCount).toBe(parseKeybindings(section.content).length);
      }
    });

    it("countAllPatterns is a projection of extractEntries", () => {
      const counts = countAllPatterns(CORPUS);
      const entries = extractEntries(CORPUS);
      expect(counts.aliases).toBe(entries.aliases.length);
      expect(counts.paths).toBe(entries.pathEntries.length);
      expect(counts.plugins).toBe(entries.plugins.length);
      expect(counts.keybindings).toBe(entries.keybindings.length);
    });
  });

  describe("array body tokenization", () => {
    it("drops inline comments and honors quoted elements", () => {
      expect(tokenizeArrayBody(["  git    # version control", "  docker", '  "some plugin"', "  'other one'"])).toEqual(
        ["git", "docker", "some plugin", "other one"],
      );
    });

    it("keeps # inside a word (not a comment start)", () => {
      expect(tokenizeArrayBody(["foo#bar baz"])).toEqual(["foo#bar", "baz"]);
    });

    it("preserves # inside quoted elements, including after whitespace", () => {
      expect(tokenizeArrayBody(['"/opt/my #tools/bin" /usr/bin'])).toEqual(["/opt/my #tools/bin", "/usr/bin"]);
      expect(tokenizeArrayBody(["'plugin #5'  next   # real comment"])).toEqual(["plugin #5", "next"]);
    });

    it("multi-line arrays with comments produce no phantom plugin entries", () => {
      const content = ["plugins=(", "  git    # version control", "  docker  # containers", ")"].join("\n");
      expect(extractEntries(content).plugins.map((p) => p.name)).toEqual(["git", "docker"]);
    });

    it("quoted path elements with whitespace stay whole", () => {
      const content = 'path+=("/opt/my tools/bin" /usr/local/bin)';
      expect(extractEntries(content).pathEntries.map((p) => p.entry)).toEqual(["/opt/my tools/bin", "/usr/local/bin"]);
    });

    it("a quoted close paren does not terminate a single-line array", () => {
      const content = 'path+=("/opt/my (tools)/bin" /usr/local/bin)';
      expect(extractEntries(content).pathEntries.map((p) => p.entry)).toEqual([
        "/opt/my (tools)/bin",
        "/usr/local/bin",
      ]);
    });

    it("a quoted close paren does not terminate a multi-line array", () => {
      const content = ["plugins=(", '  "my (cool) plugin"', "  docker", ")"].join("\n");
      expect(extractEntries(content).plugins.map((p) => p.name)).toEqual(["my (cool) plugin", "docker"]);
    });

    it("escaped quotes inside double-quoted elements stay part of the element", () => {
      expect(tokenizeArrayBody(['"my\\" plugin" docker'])).toEqual(['my" plugin', "docker"]);
      const content = 'plugins=("my\\" plugin" docker)';
      expect(extractEntries(content).plugins.map((p) => p.name)).toEqual(['my" plugin', "docker"]);
    });

    it("command substitution stays one element and does not terminate the array", () => {
      const content = "path+=($(brew --prefix)/bin /usr/local/bin)";
      expect(extractEntries(content).pathEntries.map((p) => p.entry)).toEqual([
        "$(brew --prefix)/bin",
        "/usr/local/bin",
      ]);
    });

    it("nested and double-quoted command substitutions stay whole", () => {
      expect(tokenizeArrayBody(['$(dirname $(which node))/lib "$(brew --prefix)/sbin" plain'])).toEqual([
        "$(dirname $(which node))/lib",
        "$(brew --prefix)/sbin",
        "plain",
      ]);
    });

    it("quotes inside a command substitution are kept verbatim", () => {
      const content = `path+=("$(printf '%s' "hello")" /usr/local/bin)`;
      expect(extractEntries(content).pathEntries.map((p) => p.entry)).toEqual([
        `$(printf '%s' "hello")`,
        "/usr/local/bin",
      ]);
    });

    it("a quoted close paren inside a substitution is content, not the close", () => {
      const content = `plugins=($(echo "a)b") git)`;
      expect(extractEntries(content).plugins.map((p) => p.name)).toEqual([`$(echo "a)b")`, "git"]);
    });

    it("backslashes escape outside quotes but not inside single quotes", () => {
      expect(tokenizeArrayBody(["my\\ plugin docker"])).toEqual(["my plugin", "docker"]);
      expect(tokenizeArrayBody(["'a\\b' next"])).toEqual(["a\\b", "next"]);
    });
  });

  describe("keybinding forms", () => {
    // The two most common forms (keymap+quoted-key, basic-quoted) are
    // exercised by the CORPUS; the remaining four each get a ground-truth
    // assertion here so a regression in any branch is visible.
    it("keymap string-replacement: bindkey -M <map> -s '<key>' '<cmd>'", () => {
      const [k] = extractEntries("bindkey -M viins -s 'jk' 'jj'").keybindings;
      expect(k).toMatchObject({ key: "jk", command: "jj", widget: "string-replacement", keymap: "viins" });
    });

    it("keymap unquoted key: bindkey -M <map> <key> <widget>", () => {
      const [k] = extractEntries("bindkey -M emacs ^R history-search-backward").keybindings;
      expect(k).toMatchObject({ key: "^R", command: "history-search-backward", keymap: "emacs" });
    });

    it("string-replacement: bindkey -s '<key>' '<cmd>'", () => {
      const [k] = extractEntries("bindkey -s 'll' 'ls -la'").keybindings;
      expect(k).toMatchObject({ key: "ll", command: "ls -la", widget: "string-replacement" });
    });

    it("basic unquoted key: bindkey <key> <widget>", () => {
      const [k] = extractEntries("bindkey ^P up-history").keybindings;
      expect(k).toMatchObject({ key: "^P", command: "up-history" });
    });
  });

  describe("section-like comments inside multi-line arrays", () => {
    // A comment matching a section-header format (`## tools`,
    // `# Section: X`) inside an array body must not split the array:
    // section detection would slice it into two unparseable halves and
    // per-section counts would disagree with what every view shows.
    const CONTENT = [
      "# Section: Plugins",
      "plugins=(",
      "  git",
      "  ## docker things",
      "  docker",
      ")",
      "alias after='still in Plugins'",
    ].join("\n");

    it("does not split the array or shift section context", () => {
      const sections = toLogicalSections(CONTENT);
      expect(sections.map((s) => s.label)).toEqual(["Plugins"]);
      expect(sections[0]!.pluginCount).toBe(extractEntries(CONTENT).plugins.length);
      expect(sections[0]!.pluginCount).toBe(2);
      expect(sections[0]!.aliasCount).toBe(1);
      expect(sections[0]!.otherCount).toBe(0);
    });

    it("keeps entries attributed to the enclosing section", () => {
      const entries = parseZshrc(CONTENT);
      const after = entries.find((e) => e.originalLine.includes("after"));
      expect(after?.sectionLabel).toBe("Plugins");
    });
  });

  describe("Other counts lines the registry did not recognize", () => {
    it("a recognized multi-line array contributes nothing to Other", () => {
      const content = ["plugins=(", "  git", "  docker", "  z", ")", "some-unrecognized-command --flag"].join("\n");
      // 6 non-empty lines: 5 belong to the recognized array, 1 is genuinely other
      expect(countUnrecognizedLines(content)).toBe(1);
    });

    it("section Other counts agree with the line-based definition", () => {
      const sections = toLogicalSections(CORPUS);
      for (const section of sections) {
        expect(section.otherCount).toBe(countUnrecognizedLines(section.content));
      }
    });

    it("single-line multi-element declarations no longer distort Other", () => {
      // Old formula: 1 line minus 3 plugin entries clamped to 0 — and
      // stole 2 from any real Other lines nearby
      const content = ["plugins=(git docker z)", "mystery-line-one", "mystery-line-two"].join("\n");
      expect(countUnrecognizedLines(content)).toBe(2);
    });
  });

  describe("occurrence targeting", () => {
    const ALIAS_PATTERN = /alias\s+gg=(?:'|")(.*?)(?:'|")/;
    const matchesGG = (line: string) => /^\s*alias\s+gg=(?:'|")(.*?)(?:'|")\s*$/.test(line);

    it("edits the second same-labeled section instance without touching the first", () => {
      const content = [
        "# Section: Tools",
        "alias gg='first definition'",
        "# Section: Tools",
        "alias gg='second definition'",
      ].join("\n");

      const result = replaceFirstScoped(content, "Tools", ALIAS_PATTERN, () => "", matchesGG, 1);
      expect(result.found).toBe(true);
      expect(result.content).toContain("first definition");
      expect(result.content).not.toContain("second definition");
    });

    it("refuses two identical definitions inside one section instead of guessing", () => {
      const content = ["# Section: Tools", "alias gg='first'", "alias gg='second'"].join("\n");

      const result = replaceFirstScoped(content, "Tools", ALIAS_PATTERN, () => "", matchesGG, 0);
      expect(result.found).toBe(false);
      expect(result.reason).toBe("ambiguous");
      // A refusal never modifies content
      expect(result.content).toBe(content);
    });
  });
});
