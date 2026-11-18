/**
 * Tests for lib/resolve.ts - Resolved facts (shadowing, source existence, plugin installs)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  clearResolveCaches,
  expandUserPath,
  findShadowedExecutable,
  pluginInstalled,
  sourceFileExists,
} from "../lib/resolve";

let mockZshrcPath = "";
vi.mock("../lib/zsh", () => ({
  getZshrcPath: () => mockZshrcPath,
}));

let tmpRoot: string;

beforeEach(() => {
  clearResolveCaches();
  tmpRoot = mkdtempSync(join(tmpdir(), "resolve-test-"));
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

/** Create an executable file at the given path. */
function makeExecutable(path: string): void {
  writeFileSync(path, "#!/bin/sh\n");
  chmodSync(path, 0o755);
}

describe("resolve.ts", () => {
  describe("expandUserPath", () => {
    it("expands a leading tilde against the provided home", () => {
      expect(expandUserPath("~/bin/tool", "/Users/me")).toBe("/Users/me/bin/tool");
      expect(expandUserPath("~", "/Users/me")).toBe("/Users/me");
    });

    it("expands $HOME and ${HOME} prefixes", () => {
      expect(expandUserPath("$HOME/bin", "/Users/me")).toBe("/Users/me/bin");
      expect(expandUserPath("${HOME}/bin", "/Users/me")).toBe("/Users/me/bin");
    });

    it("returns null for values it cannot expand without a shell", () => {
      expect(expandUserPath("${XDG_CACHE_HOME:-$HOME/.cache}/file", "/Users/me")).toBeNull();
      // $HOMEBREW_PREFIX must not be mangled into $HOME + "BREW_PREFIX…"
      expect(expandUserPath("$HOMEBREW_PREFIX/etc/profile.d/z.sh", "/Users/me")).toBeNull();
      expect(expandUserPath("$HOMEDIR/file", "/Users/me")).toBeNull();
      expect(expandUserPath("$ZSH/oh-my-zsh.sh", "/Users/me")).toBeNull();
      expect(expandUserPath("$(brew --prefix)/etc/profile", "/Users/me")).toBeNull();
      expect(expandUserPath("`which zsh`", "/Users/me")).toBeNull();
      expect(expandUserPath("", "/Users/me")).toBeNull();
    });

    it("passes plain absolute paths through unchanged", () => {
      expect(expandUserPath("/usr/local/bin/tool", "/Users/me")).toBe("/usr/local/bin/tool");
    });

    it("strips matching surrounding quotes before expanding", () => {
      expect(expandUserPath('"/opt/with space/file.zsh"', "/Users/me")).toBe("/opt/with space/file.zsh");
      expect(expandUserPath('"$HOME/file.zsh"', "/Users/me")).toBe("/Users/me/file.zsh");
      expect(expandUserPath("'/opt/plain.zsh'", "/Users/me")).toBe("/opt/plain.zsh");
      expect(expandUserPath('"$cache_file"', "/Users/me")).toBeNull();
    });

    it("ignores trailing inline comments after the operand", () => {
      expect(expandUserPath('"/opt/file.zsh" # loads things', "/Users/me")).toBe("/opt/file.zsh");
      expect(expandUserPath("/opt/file.zsh # loads things", "/Users/me")).toBe("/opt/file.zsh");
      expect(expandUserPath('"unterminated', "/Users/me")).toBeNull();
    });
  });

  describe("findShadowedExecutable", () => {
    it("finds an executable of the same name on the stubbed PATH", () => {
      const binDir = join(tmpRoot, "bin");
      mkdirSync(binDir);
      makeExecutable(join(binDir, "gs"));

      expect(findShadowedExecutable("gs", binDir, [])).toBe(join(binDir, "gs"));
    });

    it("returns null when nothing on PATH carries the name", () => {
      const binDir = join(tmpRoot, "bin");
      mkdirSync(binDir);

      expect(findShadowedExecutable("definitely-not-a-command", binDir, [])).toBeNull();
    });

    it("ignores non-executable files", () => {
      const binDir = join(tmpRoot, "bin");
      mkdirSync(binDir);
      writeFileSync(join(binDir, "plainfile"), "data");
      chmodSync(join(binDir, "plainfile"), 0o644);

      expect(findShadowedExecutable("plainfile", binDir, [])).toBeNull();
    });

    it("scans extra directories after the environment PATH", () => {
      const extraDir = join(tmpRoot, "extra");
      mkdirSync(extraDir);
      makeExecutable(join(extraDir, "mytool"));

      expect(findShadowedExecutable("mytool", "", [extraDir])).toBe(join(extraDir, "mytool"));
    });

    it("returns null for names containing a path separator", () => {
      expect(findShadowedExecutable("./relative", tmpRoot, [])).toBeNull();
    });

    it("scans PATH entries parsed from the config when extraDirs is not supplied", () => {
      // The production call path: aliases.tsx passes no extraDirs, so the
      // config file's PATH declarations must be parsed and scanned.
      const configBin = join(tmpRoot, "config-bin");
      mkdirSync(configBin);
      makeExecutable(join(configBin, "configtool"));
      mockZshrcPath = join(tmpRoot, ".zshrc");
      writeFileSync(mockZshrcPath, `export PATH="${configBin}:$PATH"\n`);

      expect(findShadowedExecutable("configtool", "", undefined, tmpRoot)).toBe(join(configBin, "configtool"));
    });

    it("scans PATH dirs declared via typeset -x and PATH+=", () => {
      const typesetBin = join(tmpRoot, "typeset-bin");
      const appendBin = join(tmpRoot, "append-bin");
      mkdirSync(typesetBin);
      mkdirSync(appendBin);
      makeExecutable(join(typesetBin, "typesettool"));
      makeExecutable(join(appendBin, "appendtool"));
      mockZshrcPath = join(tmpRoot, ".zshrc");
      writeFileSync(mockZshrcPath, `typeset -x PATH="${typesetBin}:$PATH"\nPATH+=:${appendBin}\n`);

      expect(findShadowedExecutable("typesettool", "", undefined, tmpRoot)).toBe(join(typesetBin, "typesettool"));
      expect(findShadowedExecutable("appendtool", "", undefined, tmpRoot)).toBe(join(appendBin, "appendtool"));
    });

    it("caches results for the session", () => {
      const binDir = join(tmpRoot, "bin");
      mkdirSync(binDir);
      makeExecutable(join(binDir, "cachedtool"));

      expect(findShadowedExecutable("cachedtool", binDir, [])).toBe(join(binDir, "cachedtool"));
      rmSync(join(binDir, "cachedtool"));
      // Still served from the session cache after deletion
      expect(findShadowedExecutable("cachedtool", binDir, [])).toBe(join(binDir, "cachedtool"));
    });
  });

  describe("sourceFileExists", () => {
    it("reports yes for a present file", () => {
      const file = join(tmpRoot, "present.zsh");
      writeFileSync(file, "# zsh");
      expect(sourceFileExists(file)).toBe("yes");
    });

    it("reports no for a missing file with a fully expandable path", () => {
      expect(sourceFileExists(join(tmpRoot, "missing.zsh"))).toBe("no");
    });

    it("expands tilde against the provided home", () => {
      writeFileSync(join(tmpRoot, "themed.zsh"), "# zsh");
      expect(sourceFileExists("~/themed.zsh", tmpRoot)).toBe("yes");
    });

    it("reports yes for an existing file whose source operand is quoted", () => {
      const file = join(tmpRoot, "quoted file.zsh");
      writeFileSync(file, "# zsh");
      expect(sourceFileExists(`"${file}"`, tmpRoot)).toBe("yes");
    });

    it("reports yes when a quoted operand carries a trailing comment", () => {
      const file = join(tmpRoot, "commented.zsh");
      writeFileSync(file, "# zsh");
      expect(sourceFileExists(`"${file}" # syntax highlighting`, tmpRoot)).toBe("yes");
    });

    // Root bypasses permission checks, so the EACCES case cannot be
    // provoked when running as root (e.g. some CI containers) — skip
    // rather than silently pass.
    it.runIf(process.getuid?.() !== 0)(
      "reports unknown, never missing, when the path exists but cannot be read",
      () => {
        const dir = join(tmpRoot, "sealed");
        mkdirSync(dir);
        writeFileSync(join(dir, "guarded.zsh"), "# zsh");
        chmodSync(dir, 0o000);
        try {
          expect(sourceFileExists(join(dir, "guarded.zsh"))).toBe("unknown");
        } finally {
          chmodSync(dir, 0o755);
        }
      },
    );

    it("reports unknown, never missing, for unexpandable paths", () => {
      expect(sourceFileExists("${XDG_CACHE_HOME:-$HOME/.cache}/p10k.zsh", tmpRoot)).toBe("unknown");
      expect(sourceFileExists("$ZSH/oh-my-zsh.sh", tmpRoot)).toBe("unknown");
    });
  });

  describe("pluginInstalled", () => {
    it("reports yes for a plugin directory under ~/.oh-my-zsh/plugins", () => {
      mkdirSync(join(tmpRoot, ".oh-my-zsh", "plugins", "git"), { recursive: true });
      expect(pluginInstalled("git", tmpRoot, {})).toBe("yes");
    });

    it("finds plugins in ZSH_CUSTOM before the default root", () => {
      const custom = join(tmpRoot, "custom");
      mkdirSync(join(custom, "plugins", "myplugin"), { recursive: true });
      expect(pluginInstalled("myplugin", tmpRoot, { ZSH_CUSTOM: custom })).toBe("yes");
    });

    it("reports no when a plugins directory exists but lacks the plugin", () => {
      mkdirSync(join(tmpRoot, ".oh-my-zsh", "plugins"), { recursive: true });
      expect(pluginInstalled("absent-plugin", tmpRoot, {})).toBe("no");
    });

    it("reports unknown when no Oh My Zsh installation exists at all", () => {
      expect(pluginInstalled("git", tmpRoot, {})).toBe("unknown");
    });

    it("reports unknown for an empty name", () => {
      expect(pluginInstalled("", tmpRoot, {})).toBe("unknown");
    });

    it("honors a ZSH_CUSTOM declared in the config when the environment lacks it", () => {
      const custom = join(tmpRoot, "my-custom");
      mkdirSync(join(custom, "plugins", "configplugin"), { recursive: true });
      // Standard OMZ plugins dir exists but lacks the plugin — without the
      // config-declared custom root this would report a false "no".
      mkdirSync(join(tmpRoot, ".oh-my-zsh", "plugins"), { recursive: true });
      mockZshrcPath = join(tmpRoot, ".zshrc");
      writeFileSync(mockZshrcPath, `export ZSH_CUSTOM="${custom}"\n`);

      expect(pluginInstalled("configplugin", tmpRoot, {})).toBe("yes");
    });

    it("honors a plain (unexported) ZSH_CUSTOM assignment in the config", () => {
      const custom = join(tmpRoot, "plain-custom");
      mkdirSync(join(custom, "plugins", "plainplugin"), { recursive: true });
      mkdirSync(join(tmpRoot, ".oh-my-zsh", "plugins"), { recursive: true });
      mockZshrcPath = join(tmpRoot, ".zshrc");
      writeFileSync(mockZshrcPath, `ZSH_CUSTOM=${custom}\n`);

      expect(pluginInstalled("plainplugin", tmpRoot, {})).toBe("yes");
    });

    it("reports unknown, not no, when a declared root cannot be expanded", () => {
      mkdirSync(join(tmpRoot, ".oh-my-zsh", "plugins"), { recursive: true });
      mockZshrcPath = join(tmpRoot, ".zshrc");
      writeFileSync(mockZshrcPath, 'export ZSH_CUSTOM="$XDG_DATA_HOME/omz-custom"\n');

      expect(pluginInstalled("maybe-there", tmpRoot, {})).toBe("unknown");
    });
  });
});
