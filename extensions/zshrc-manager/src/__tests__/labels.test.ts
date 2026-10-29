/**
 * Tests for the labelling rule: shortest unambiguous identifier.
 */

import { describe, it, expect } from "vitest";
import { deriveLabel, disambiguate } from "../lib/labels";

describe("deriveLabel", () => {
  it("reduces a path to its last segment", () => {
    expect(deriveLabel("/opt/homebrew/bin")).toBe("bin");
    expect(deriveLabel("~/.config/zsh/extra.zsh")).toBe("extra.zsh");
  });

  it("handles trailing slashes", () => {
    expect(deriveLabel("/usr/local/bin/")).toBe("bin");
  });

  it("reduces a command to the program name", () => {
    expect(deriveLabel("git status --short")).toBe("git");
    expect(deriveLabel("brew shellenv")).toBe("brew");
  });

  it("keeps single tokens as written", () => {
    expect(deriveLabel("AUTO_CD")).toBe("AUTO_CD");
    expect(deriveLabel("gs")).toBe("gs");
  });

  it("strips surrounding quotes", () => {
    expect(deriveLabel('"$HOME/bin"')).toBe("bin");
    expect(deriveLabel("'ll'")).toBe("ll");
  });

  it("never invents a placeholder", () => {
    expect(deriveLabel("  spaced value  ")).toBe("spaced");
    // A bare separator still yields the cleaned input rather than a stand-in
    expect(deriveLabel("/")).toBe("/");
  });
});

describe("disambiguate", () => {
  interface Item {
    type: string;
    label: string;
    name: string;
  }
  const identity = (item: Item) => item.name;
  const make = (name: string, type = "path"): Item => ({ type, label: deriveLabel(name), name });

  it("keeps unique labels unchanged", () => {
    const items = [make("/opt/homebrew/bin"), make("/usr/local/sbin")];
    const result = disambiguate(items, identity);
    expect(result.map((i) => i.label)).toEqual(["bin", "sbin"]);
  });

  it("lengthens colliding paths one segment at a time until unique", () => {
    const items = [make("/opt/homebrew/bin"), make("/usr/local/bin")];
    const result = disambiguate(items, identity);
    expect(result.map((i) => i.label)).toEqual(["homebrew/bin", "local/bin"]);
  });

  it("widens further when two segments still collide", () => {
    const items = [make("/a/x/tools/bin"), make("/b/y/tools/bin")];
    const result = disambiguate(items, identity);
    expect(result.map((i) => i.label)).toEqual(["x/tools/bin", "y/tools/bin"]);
  });

  it("falls back to the full identity when paths differ only above the widening bound", () => {
    // Last five segments are identical; only the leading segment differs
    const items = [make("/one/d1/d2/d3/d4/bin"), make("/two/d1/d2/d3/d4/bin")];
    const result = disambiguate(items, identity);
    expect(result.map((i) => i.label)).toEqual(["/one/d1/d2/d3/d4/bin", "/two/d1/d2/d3/d4/bin"]);
    expect(new Set(result.map((i) => i.label)).size).toBe(2);
  });

  it("only collides within the same type", () => {
    const items = [make("/opt/homebrew/bin", "path"), make("/usr/local/bin", "fpath")];
    const result = disambiguate(items, identity);
    expect(result.map((i) => i.label)).toEqual(["bin", "bin"]);
  });

  it("leaves genuinely identical identities alone", () => {
    // Same alias defined twice: widening cannot separate them, and the
    // label must not degrade into an invented placeholder
    const items = [make("gs", "alias"), make("gs", "alias")];
    const result = disambiguate(items, identity);
    expect(result.map((i) => i.label)).toEqual(["gs", "gs"]);
  });
});
