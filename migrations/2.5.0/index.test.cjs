const assert = require("node:assert/strict");
const { test } = require("node:test");

require("@babel/register")({
  presets: [require.resolve("@babel/preset-typescript")],
  plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
  extensions: [".ts"],
  ignore: [/node_modules/],
});
const transform = require("./index.ts").default;
const j = require("jscodeshift").withParser("tsx");
const migrate = (source) =>
  transform({ path: "command.tsx", source }, { jscodeshift: j });
const normalize = (source) =>
  j(source).toSource({ quote: "double", reuseWhitespace: false });

function check(name, before, after) {
  test(name, () => {
    const result = migrate(before);
    if (after === undefined) assert.equal(result, null);
    else {
      assert.equal(normalize(result), normalize(after));
      assert.equal(migrate(result), null, "migration must be idempotent");
    }
  });
}

check(
  "environment access, aliases, computed literals and optional chaining",
  `
import { environment as env } from "@raycast/api";
console.log(env.commandName, env["commandMode"], env?.commandName);
`,
  `
import { environment as env } from "@raycast/api";
console.log(env.entryPointName, env["entryPointMode"], env?.entryPointName);
`,
);
check(
  "environment destructuring preserves bindings and defaults",
  `
import { environment } from "@raycast/api";
const { commandName, commandMode: mode = "view", appearance } = environment;
console.log(commandName, mode);
`,
  `
import { environment } from "@raycast/api";
const { entryPointName: commandName, entryPointMode: mode = "view", appearance } = environment;
console.log(commandName, mode);
`,
);
check(
  "environment destructuring assignment",
  `
import { environment } from "@raycast/api";
let commandName;
({ commandName } = environment);
`,
  `
import { environment } from "@raycast/api";
let commandName;
({ entryPointName: commandName } = environment);
`,
);
check(
  "namespace environment import",
  `
import * as Raycast from "@raycast/api";
const { commandMode = "view" } = Raycast.environment;
console.log(Raycast.environment.commandName);
`,
  `
import * as Raycast from "@raycast/api";
const { entryPointMode: commandMode = "view" } = Raycast.environment;
console.log(Raycast.environment.entryPointName);
`,
);
check(
  "shadowed environment and unrelated properties",
  `
import { environment } from "@raycast/api";
function other(environment) { return environment.commandName; }
console.log(environment.appearance, environment.toString, environment[key]);
`,
);
check(
  "other packages",
  `
import { environment, Action, Keyboard } from "another-api";
const shortcut: Keyboard.Shortcut = { macOS: {}, windows: {} };
console.log(environment.commandName);
const action = <Action shortcut={{ macOS: {}, windows: {} }} />;
`,
);
check(
  "Raycast JSX shortcut with aliased component and windows modifier",
  `
import { Action as A } from "@raycast/api";
const action = <A.Push shortcut={{ macOS: { modifiers: ["cmd"], key: "a" }, windows: { modifiers: ["windows"], key: "a" } }} />;
`,
  `
import { Action as A } from "@raycast/api";
const action = <A.Push shortcut={{ macOS: { modifiers: ["cmd"], key: "a" }, Windows: { modifiers: ["windows"], key: "a" } }} />;
`,
);
check(
  "namespace component and quoted key",
  `
import * as RC from "@raycast/api";
const action = <RC.Action shortcut={{ macOS: {}, "windows": {} }} />;
`,
  `
import * as RC from "@raycast/api";
const action = <RC.Action shortcut={{ macOS: {}, Windows: {} }} />;
`,
);
check(
  "typed shortcut and shorthand preserves value",
  `
import { Keyboard as K } from "@raycast/api";
const windows = { modifiers: ["ctrl"], key: "a" };
const shortcut: K.Shortcut = { macOS: {}, windows };
`,
  `
import { Keyboard as K } from "@raycast/api";
const windows = { modifiers: ["ctrl"], key: "a" };
const shortcut: K.Shortcut = { macOS: {}, Windows: windows };
`,
);
check(
  "satisfies and type assertion",
  `
import { Keyboard } from "@raycast/api";
const a = { macOS: {}, windows: {} } satisfies Keyboard.Shortcut;
const b = { macOS: {}, windows: {} } as Keyboard.Shortcut;
`,
  `
import { Keyboard } from "@raycast/api";
const a = { macOS: {}, Windows: {} } satisfies Keyboard.Shortcut;
const b = { macOS: {}, Windows: {} } as Keyboard.Shortcut;
`,
);
check(
  "shortcut variable passed to a Raycast action",
  `
import { Action } from "@raycast/api";
const shortcut = { macOS: {}, windows: {} };
const action = <Action shortcut={shortcut} />;
`,
  `
import { Action } from "@raycast/api";
const shortcut = { macOS: {}, Windows: {} };
const action = <Action shortcut={shortcut} />;
`,
);
check(
  "unrelated objects and custom components",
  `
import { Action } from "@raycast/api";
const config = { macOS: {}, windows: {} };
const action = <Custom shortcut={{ macOS: {}, windows: {} }} />;
function other(Action) { return <Action shortcut={{ macOS: {}, windows: {} }} />; }
`,
);
check(
  "existing Windows key is not overwritten",
  `
import { Keyboard } from "@raycast/api";
const shortcut: Keyboard.Shortcut = { macOS: {}, windows: { key: "a" }, Windows: { key: "b" } };
`,
);
check(
  "dynamic computed keys are unchanged",
  `
import { Keyboard } from "@raycast/api";
const shortcut: Keyboard.Shortcut = { macOS: {}, [windows]: {} };
`,
);
check(
  "reads and destructuring follow a migrated shortcut",
  `
import type { Keyboard } from "@raycast/api";
const shortcut: Keyboard.Shortcut = { macOS: {}, windows: {} };
const { windows: win } = shortcut;
console.log(shortcut.windows, shortcut["windows"], shortcut?.windows);
function other(shortcut) { return shortcut.windows; }
`,
  `
import type { Keyboard } from "@raycast/api";
const shortcut: Keyboard.Shortcut = { macOS: {}, Windows: {} };
const { Windows: win } = shortcut;
console.log(shortcut.Windows, shortcut["Windows"], shortcut?.Windows);
function other(shortcut) { return shortcut.windows; }
`,
);
check(
  "shortcut bindings are scoped",
  `
import { Keyboard } from "@raycast/api";
const shortcut: Keyboard.Shortcut = { macOS: {}, windows: {} };
function other() { const shortcut = { windows: {} }; return shortcut.windows; }
`,
  `
import { Keyboard } from "@raycast/api";
const shortcut: Keyboard.Shortcut = { macOS: {}, Windows: {} };
function other() { const shortcut = { windows: {} }; return shortcut.windows; }
`,
);
check(
  "spread precedence requires manual review",
  `
import { Keyboard } from "@raycast/api";
const shortcut: Keyboard.Shortcut = { ...defaults, windows: { key: "a" } };
console.log(shortcut.windows);
`,
);
check(
  "catch without an error binding",
  `
import { environment, Action } from "@raycast/api";
try {} catch {
  console.log(environment.commandName);
  const action = <Action shortcut={{ macOS: {}, windows: {} }} />;
}
`,
  `
import { environment, Action } from "@raycast/api";
try {} catch {
  console.log(environment.entryPointName);
  const action = <Action shortcut={{ macOS: {}, Windows: {} }} />;
}
`,
);
check(
  "block-local shadows are conservatively skipped",
  `
import { environment } from "@raycast/api";
function run() {
  console.log(environment.commandName);
  { const environment = other; console.log(environment.commandName); }
}
`,
);
check(
  "top-level block shadows are conservatively skipped",
  `
import { environment } from "@raycast/api";
{ const environment = other; console.log(environment.commandName); }
`,
);

check(
  "shortcut destructuring assignments preserve aliases and defaults",
  `
import type { Keyboard } from "@raycast/api";
const shortcut: Keyboard.Shortcut = { macOS: {}, windows: { key: "a" } };
let windows, win, fallback;
({ windows } = shortcut);
({ windows: win } = shortcut);
({ ["windows"]: fallback = {} } = shortcut);
`,
  `
import type { Keyboard } from "@raycast/api";
const shortcut: Keyboard.Shortcut = { macOS: {}, Windows: { key: "a" } };
let windows, win, fallback;
({ Windows: windows } = shortcut);
({ Windows: win } = shortcut);
({ Windows: fallback = {} } = shortcut);
`,
);

for (const unsafe of [
  '{ ...defaults, windows: { key: "a" } }',
  '{ [platform]: {}, windows: { key: "a" } }',
  '{ Windows: {}, windows: { key: "a" } }',
  "getShortcut()",
]) {
  check(
    `skip a shortcut binding with unsafe initializer ${unsafe}`,
    `
import type { Keyboard } from "@raycast/api";
let shortcut: Keyboard.Shortcut = ${unsafe};
if (flag) shortcut = { macOS: {}, windows: { key: "b" } };
console.log(shortcut.windows);
`,
  );
  check(
    `skip a shortcut binding with unsafe reassignment ${unsafe}`,
    `
import type { Keyboard } from "@raycast/api";
let shortcut: Keyboard.Shortcut = { macOS: {}, windows: { key: "b" } };
if (flag) shortcut = ${unsafe};
console.log(shortcut.windows);
`,
  );
}

check(
  "migrate every safe assignment to a shortcut binding",
  `
import type { Keyboard } from "@raycast/api";
let shortcut: Keyboard.Shortcut;
shortcut = { macOS: {}, windows: { key: "a" } };
if (flag) shortcut = { macOS: {}, windows: { key: "b" } };
console.log(shortcut.windows);
`,
  `
import type { Keyboard } from "@raycast/api";
let shortcut: Keyboard.Shortcut;
shortcut = { macOS: {}, Windows: { key: "a" } };
if (flag) shortcut = { macOS: {}, Windows: { key: "b" } };
console.log(shortcut.Windows);
`,
);

check(
  "asserted shortcut bindings migrate all assignments",
  `
import type { Keyboard } from "@raycast/api";
let shortcut = { macOS: {}, windows: { key: "a" } } as Keyboard.Shortcut;
if (flag) shortcut = { macOS: {}, windows: { key: "b" } };
console.log(shortcut.windows);
`,
  `
import type { Keyboard } from "@raycast/api";
let shortcut = { macOS: {}, Windows: { key: "a" } } as Keyboard.Shortcut;
if (flag) shortcut = { macOS: {}, Windows: { key: "b" } };
console.log(shortcut.Windows);
`,
);
