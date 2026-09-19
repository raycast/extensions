const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

function loadModule() {
  const source = readFileSync(path.join(__dirname, "..", "src", "actions", "powershell.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  });
  const exports = {};
  runInNewContext(outputText, { exports });
  return exports;
}

const { psLiteral, newTabPowerShellScript, searchPowerShellScript } = loadModule();

test("psLiteral wraps values in single quotes and doubles embedded single quotes", () => {
  assert.equal(psLiteral("plain"), "'plain'");
  assert.equal(psLiteral("a'b"), "'a''b'");
});

test("new-tab script opens Zen without arguments when there is no query", () => {
  assert.equal(newTabPowerShellScript(undefined), 'Start-Process "zen"');
  assert.equal(newTabPowerShellScript(""), 'Start-Process "zen"');
});

test("new-tab script passes the query as a single-quoted literal", () => {
  assert.equal(newTabPowerShellScript("foo"), 'Start-Process "zen" "-search" \'foo\'');
});

test("new-tab query containing a PowerShell subexpression is not evaluated", () => {
  assert.equal(newTabPowerShellScript("$(calc)"), 'Start-Process "zen" "-search" \'$(calc)\'');
});

test("new-tab query containing double quotes cannot break out of the argument", () => {
  assert.equal(newTabPowerShellScript('a"b'), 'Start-Process "zen" "-search" \'a"b\'');
});

test("new-tab query containing single quotes is doubled inside the literal", () => {
  assert.equal(newTabPowerShellScript("a'b"), 'Start-Process "zen" "-search" \'a\'\'b\'');
});

test("explicit-engine script builds one single-quoted argument from prefix and query", () => {
  assert.equal(
    searchPowerShellScript("https://google.com/search?q=", "foo"),
    'Start-Process "zen" \'https://google.com/search?q=foo\'',
  );
  assert.equal(
    searchPowerShellScript("https://google.com/search?q=", undefined),
    'Start-Process "zen" \'https://google.com/search?q=\'',
  );
});

test("explicit-engine query containing a subexpression or quotes is not evaluated", () => {
  assert.equal(
    searchPowerShellScript("https://google.com/search?q=", "$(calc)"),
    'Start-Process "zen" \'https://google.com/search?q=$(calc)\'',
  );
  assert.equal(
    searchPowerShellScript("https://google.com/search?q=", 'a"b\'c'),
    'Start-Process "zen" \'https://google.com/search?q=a"b\'\'c\'',
  );
});
