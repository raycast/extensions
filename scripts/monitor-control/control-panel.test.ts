import assert from "node:assert/strict";
import { test } from "node:test";
import { characterBar, controlPanelMarkdown } from "../../extensions/monitor-control/src/lib/control-panel";
import { initialDefaults, parseResetDefault } from "../../extensions/monitor-control/src/lib/controls";
import type { DisplayState } from "../../extensions/monitor-control/src/lib/m1ddc";

const state: DisplayState = {
  volume: { reading: { current: 15, maximum: 100 } },
  luminance: { reading: { current: 127.5, maximum: 255 } },
  contrast: { reading: { current: 75, maximum: 100 } },
};

test("every control renders an icon, name, percentage, bar, and reset default", () => {
  const markdown = controlPanelMarkdown(state, initialDefaults);
  for (const text of ["Volume", "Brightness", "Contrast", "15%", "50%", "75%", "Default 20%", "Default 50%"])
    assert.ok(markdown.includes(text), text);
  for (const symbol of ["🔊", "☀", "◐"]) assert.ok(markdown.includes(symbol));
  assert.ok(markdown.includes("██████████░░░░░░░░░░"));
  assert.ok(markdown.includes("Reset `⌘ 0`"));
  assert.equal(markdown.split("\n").length, 11);
  assert.ok(!markdown.includes("<svg"));
  assert.ok(!markdown.includes("data:image"));
});

test("unavailable controls do not appear as zero and requested levels remain distinct", () => {
  const markdown = controlPanelMarkdown(
    {
      ...state,
      volume: { reading: { current: 20, maximum: 100, unconfirmed: true } },
      contrast: { error: "The built-in display does not expose contrast." },
    },
    initialDefaults,
  );
  assert.ok(markdown.includes("Unavailable"));
  assert.ok(markdown.includes("20% (requested)"));
  const loading = controlPanelMarkdown(undefined, initialDefaults);
  assert.equal((loading.match(/Reading…/g) ?? []).length, 3);
});

test("invalid readings cannot produce huge percentages or overfilled bars", () => {
  const markdown = controlPanelMarkdown(
    { ...state, volume: { reading: { current: 48750, maximum: 100 } } },
    initialDefaults,
  );
  assert.ok(!markdown.includes("48750"));
  assert.ok(markdown.includes("Unavailable"));
  assert.equal(characterBar({ current: 0, maximum: 100 }), "░".repeat(20));
  assert.equal(characterBar({ current: 100, maximum: 100 }), "█".repeat(20));
});

test("default percentages accept zero and reject invalid preference input", () => {
  assert.equal(parseResetDefault(undefined, 20), 20);
  assert.equal(parseResetDefault("", 20), 20);
  assert.equal(parseResetDefault("0", 20), 0);
  assert.equal(parseResetDefault(" 15% ", 20), 15);
  assert.equal(parseResetDefault("100", 20), 100);
  for (const invalid of ["-1", "101", "NaN", "Infinity", "15.5", "15abc", "%", "1e2"])
    assert.equal(parseResetDefault(invalid, 20), undefined, invalid);
});
