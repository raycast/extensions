/**
 * Tests for the resolved-fact warning generators in the view files.
 *
 * The resolve layer is mocked: these tests assert the wiring that turns a
 * resolved fact into an ItemWarning — type, message, icon and color — and
 * that "unknown" facts never produce a warning.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Color, Icon } from "@raycast/api";
import { findShadowedExecutable, pluginInstalled, sourceFileExists } from "../lib/resolve";
import { generateAliasWarning } from "../aliases";
import { generateSourceWarning } from "../sources";
import { generatePluginWarning } from "../plugins";

vi.mock("../lib/resolve", () => ({
  findShadowedExecutable: vi.fn(),
  pluginInstalled: vi.fn(),
  sourceFileExists: vi.fn(),
}));

const mockShadow = vi.mocked(findShadowedExecutable);
const mockPlugin = vi.mocked(pluginInstalled);
const mockSource = vi.mocked(sourceFileExists);

function aliasItem(name: string) {
  return { name, command: "x", section: "S", sectionStartLine: 1 };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("generateAliasWarning", () => {
  it("returns a duplicate warning before considering shadows", () => {
    const a = aliasItem("gs");
    const b = aliasItem("gs");
    mockShadow.mockReturnValue("/usr/bin/gs");

    const warning = generateAliasWarning(a, [a, b]);
    expect(warning?.type).toBe("duplicate");
    expect(warning?.icon).toBe(Icon.ExclamationMark);
    expect(warning?.color).toBe(Color.Yellow);
    expect(mockShadow).not.toHaveBeenCalled();
  });

  it("returns an orange conflict warning naming the shadowed executable", () => {
    mockShadow.mockReturnValue("/bin/cat");
    const a = aliasItem("cat");

    const warning = generateAliasWarning(a, [a]);
    expect(warning?.type).toBe("conflict");
    expect(warning?.message).toBe("Shadows /bin/cat");
    expect(warning?.icon).toBe(Icon.ExclamationMark);
    expect(warning?.color).toBe(Color.Orange);
  });

  it("returns null when nothing is shadowed", () => {
    mockShadow.mockReturnValue(null);
    const a = aliasItem("unshadowed");
    expect(generateAliasWarning(a, [a])).toBeNull();
  });
});

describe("generateSourceWarning", () => {
  it("returns a red broken warning for a missing file", () => {
    mockSource.mockReturnValue("no");
    const warning = generateSourceWarning({ path: "/gone.zsh", section: "S", sectionStartLine: 1 });
    expect(warning?.type).toBe("broken");
    expect(warning?.message).toBe("Source file missing");
    expect(warning?.icon).toBe(Icon.ExclamationMark);
    expect(warning?.color).toBe(Color.Red);
  });

  it.each(["yes", "unknown"] as const)("stays silent when the fact is %s", (fact) => {
    mockSource.mockReturnValue(fact);
    expect(generateSourceWarning({ path: "/x.zsh", section: "S", sectionStartLine: 1 })).toBeNull();
  });
});

describe("generatePluginWarning", () => {
  it("returns a red broken warning for an uninstalled plugin", () => {
    mockPlugin.mockReturnValue("no");
    const warning = generatePluginWarning({ name: "ghost", section: "S", sectionStartLine: 1 });
    expect(warning?.type).toBe("broken");
    expect(warning?.message).toBe("Plugin not installed");
    expect(warning?.icon).toBe(Icon.ExclamationMark);
    expect(warning?.color).toBe(Color.Red);
  });

  it.each(["yes", "unknown"] as const)("stays silent when the fact is %s", (fact) => {
    mockPlugin.mockReturnValue(fact);
    expect(generatePluginWarning({ name: "git", section: "S", sectionStartLine: 1 })).toBeNull();
  });
});
