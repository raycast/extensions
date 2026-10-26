const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { spawnSync } = require("node:child_process");
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

const { psLiteral, windowsArg, newTabPowerShellScript, searchPowerShellScript } = loadModule();

test("psLiteral wraps values in single quotes and doubles embedded single quotes", () => {
  assert.equal(psLiteral("plain"), "'plain'");
  assert.equal(psLiteral("a'b"), "'a''b'");
});

test("windowsArg quotes the value and escapes double quotes and the backslashes before them", () => {
  assert.equal(windowsArg("two words"), '"two words"');
  assert.equal(windowsArg('a"b'), '"a\\"b"');
  assert.equal(windowsArg('a\\"b'), '"a\\\\\\"b"');
  assert.equal(windowsArg("a\\b"), '"a\\b"');
  assert.equal(windowsArg("trailing\\"), '"trailing\\\\"');
});

test(
  "windowsArg values reach a Windows program as one unchanged argument",
  { skip: process.platform !== "win32" && "needs the Windows command line" },
  () => {
    const values = ["two words", 'say "hi"', 'dir\\sub\\ "x"', "trailing\\", "it's $(calc)", "caffè 日本", ""];
    // Verbatim arguments leave the program path unquoted too, so node is started
    // by its bare name from its own folder (the path may contain spaces).
    const { stdout } = spawnSync(
      path.basename(process.execPath),
      ["-e", '"process.stdout.write(JSON.stringify(process.argv.slice(1)))"', ...values.map(windowsArg)],
      { cwd: path.dirname(process.execPath), windowsVerbatimArguments: true, encoding: "utf8" },
    );
    assert.deepEqual(JSON.parse(stdout), values);
  },
);

test("new-tab script opens Zen without arguments when there is no query", () => {
  assert.equal(newTabPowerShellScript(undefined), 'Start-Process "zen"');
  assert.equal(newTabPowerShellScript(""), 'Start-Process "zen"');
});

test("new-tab script passes -search and the query as one argument list string", () => {
  assert.equal(newTabPowerShellScript("foo"), 'Start-Process "zen" -ArgumentList \'-search "foo"\'');
  assert.equal(newTabPowerShellScript("two words"), 'Start-Process "zen" -ArgumentList \'-search "two words"\'');
});

test("new-tab query containing a PowerShell subexpression is not evaluated", () => {
  assert.equal(newTabPowerShellScript("$(calc)"), 'Start-Process "zen" -ArgumentList \'-search "$(calc)"\'');
});

test("new-tab query containing double quotes cannot break out of the argument", () => {
  assert.equal(newTabPowerShellScript('a"b'), 'Start-Process "zen" -ArgumentList \'-search "a\\"b"\'');
});

test("new-tab query containing single quotes is doubled inside the literal", () => {
  assert.equal(newTabPowerShellScript("a'b"), "Start-Process \"zen\" -ArgumentList '-search \"a''b\"'");
});

test("new-tab query starting with - or / gets a leading space so Zen does not read it as an option", () => {
  assert.equal(newTabPowerShellScript("-foo"), 'Start-Process "zen" -ArgumentList \'-search " -foo"\'');
  assert.equal(newTabPowerShellScript("/r/rust"), 'Start-Process "zen" -ArgumentList \'-search " /r/rust"\'');
});

test("explicit-engine script passes prefix and query as one quoted argument", () => {
  assert.equal(
    searchPowerShellScript("https://google.com/search?q=", "two words"),
    'Start-Process "zen" -ArgumentList \'"https://google.com/search?q=two words"\'',
  );
  assert.equal(
    searchPowerShellScript("https://google.com/search?q=", undefined),
    'Start-Process "zen" -ArgumentList \'"https://google.com/search?q="\'',
  );
});

test("explicit-engine query containing a subexpression or quotes is not evaluated", () => {
  assert.equal(
    searchPowerShellScript("https://google.com/search?q=", "$(calc)"),
    'Start-Process "zen" -ArgumentList \'"https://google.com/search?q=$(calc)"\'',
  );
  assert.equal(
    searchPowerShellScript("https://google.com/search?q=", "a\"b'c"),
    'Start-Process "zen" -ArgumentList \'"https://google.com/search?q=a\\"b\'\'c"\'',
  );
});
