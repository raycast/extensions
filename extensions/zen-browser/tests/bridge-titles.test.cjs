const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  savedTitles,
  decode,
  enrichTabs,
  KEY,
} = require("../assets/bridge/titles.cjs");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
function packed(state) {
  const b = Buffer.from(JSON.stringify(state));
  const header = Buffer.alloc(12);
  header.write("mozLz40\0");
  header.writeUInt32LE(b.length, 8);
  const lengths = [];
  let n = b.length - 15;
  while (n >= 255) {
    lengths.push(255);
    n -= 255;
  }
  lengths.push(n);
  return Buffer.concat([header, Buffer.from([240, ...lengths]), b]);
}
const tab = (id, title) => ({
  pinned: true,
  zenStaticLabel: title,
  extData: { [KEY]: JSON.stringify(id) },
  entries: [{ url: "https://same.test" }],
});
test("matches session identity, not URL; excludes private and conflicting entries", () => {
  const state = {
    tabs: [tab("s:1", "First"), tab("s:2", "Second")],
    windows: [{ isPrivate: true, tabs: [tab("s:3", "Private")] }],
  };
  const titles = savedTitles(state, new Set(["s:1", "s:2", "s:3"]));
  assert.equal(titles.get("s:1"), "First");
  assert.equal(titles.get("s:2"), "Second");
  assert.ok(!titles.has("s:3"));
  state.tabs.push(tab("s:1", "Conflict"));
  assert.equal(savedTitles(state, new Set(["s:1"])).get("s:1"), null);
});
test("reads fresh renames and removals; malformed snapshots never restore stale aliases", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "zen-titles-"));
  fs.mkdirSync(path.join(root, "profile"));
  const file = path.join(root, "profile", "zen-sessions.jsonlz4");
  const live = [{ id: "s:1", title: "Page", pinned: true }];
  try {
    fs.writeFileSync(file, packed({ tabs: [tab("s:1", "Alias")] }));
    assert.equal(enrichTabs(live, root)[0].title, "Alias");
    fs.writeFileSync(file, packed({ tabs: [tab("s:1", "Renamed")] }));
    assert.equal(enrichTabs(live, root)[0].title, "Renamed");
    fs.writeFileSync(file, packed({ tabs: [tab("s:1", "")] }));
    assert.equal(enrichTabs(live, root)[0].title, "Page");
    fs.writeFileSync(file, "broken");
    assert.equal(enrichTabs(live, root)[0].title, "Page");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("decoder rejects truncated or oversized data", () => {
  assert.throws(() => decode(Buffer.from("broken")));
  const b = packed({ tabs: [] });
  assert.throws(() => decode(b.subarray(0, b.length - 1)));
  b.writeUInt32LE(0xffffffff, 8);
  assert.throws(() => decode(b));
});
