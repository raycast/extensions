const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { configure } = require("../assets/bridge/setup.cjs");

test("installs a working host, repairs it and removes only its own registration", async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "zen-setup-"));
  const support = path.join(home, "support ' quoted");
  const manifest = path.join(home, "Library/Application Support/Mozilla/NativeMessagingHosts/zen_browser_bridge.json");
  try {
    await configure("install", support, home);
    const registration = JSON.parse(await fs.readFile(manifest));
    assert.deepEqual(registration.allowed_extensions, ["zen-browser-bridge@sandzhaj"]);
    assert.equal((await fs.stat(registration.path)).mode & 0o777, 0o700);
    const child = spawn(registration.path, [], { env: { ...process.env, HOME: home } });
    const exited = once(child, "exit");
    child.stdin.end();
    assert.equal((await exited)[0], 0);
    await fs.writeFile(registration.path, "broken");
    await configure("install", support, home);
    assert.match(await fs.readFile(registration.path, "utf8"), /^#!\/bin\/sh/);
    await configure("remove", support, home);
    await assert.rejects(fs.stat(manifest), { code: "ENOENT" });
    await assert.rejects(fs.stat(path.join(support, "zen-browser-bridge")), { code: "ENOENT" });
    await configure("remove", support, home);
  } finally {
    await fs.rm(home, { recursive: true, force: true });
  }
});

test("does not remove another installation or overwrite an unrelated registration", async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "zen-setup-"));
  const manifest = path.join(home, "Library/Application Support/Mozilla/NativeMessagingHosts/zen_browser_bridge.json");
  try {
    await fs.mkdir(path.dirname(manifest), { recursive: true });
    const content = JSON.stringify({ name: "other", path: "/another/host", allowed_extensions: ["other"] });
    await fs.writeFile(manifest, content);
    await assert.rejects(configure("remove", path.join(home, "support"), home), /another installation/);
    await assert.rejects(configure("install", path.join(home, "support"), home), /unrelated/);
    assert.equal(await fs.readFile(manifest, "utf8"), content);
  } finally {
    await fs.rm(home, { recursive: true, force: true });
  }
});
