const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const KEY = "extension:zen-browser-bridge@sandzhaj:bridge-tab-id";

function decode(buffer) {
  if (
    buffer.length < 12 ||
    !buffer.subarray(0, 8).equals(Buffer.from("mozLz40\0"))
  )
    throw Error("Invalid session");
  const size = buffer.readUInt32LE(8);
  if (size > 64 * 1024 * 1024) throw Error("Session too large");
  const out = Buffer.alloc(size);
  let i = 12,
    j = 0;
  const length = (n) => {
    if (n === 15) {
      let v;
      do {
        if (i >= buffer.length) throw Error("Truncated length");
        v = buffer[i++];
        n += v;
      } while (v === 255);
    }
    return n;
  };
  while (i < buffer.length) {
    const token = buffer[i++];
    const literals = length(token >> 4);
    if (i + literals > buffer.length || j + literals > size)
      throw Error("Invalid literals");
    buffer.copy(out, j, i, i + literals);
    i += literals;
    j += literals;
    if (i === buffer.length) break;
    if (i + 2 > buffer.length) throw Error("Truncated offset");
    const offset = buffer.readUInt16LE(i);
    i += 2;
    const count = length(token & 15) + 4;
    if (!offset || offset > j || j + count > size) throw Error("Invalid match");
    for (let n = 0; n < count; n++, j++) out[j] = out[j - offset];
  }
  if (j !== size) throw Error("Invalid size");
  return JSON.parse(out.toString());
}

function savedTitles(state, wanted) {
  const result = new Map();
  for (const window of [state, ...(state.windows || [])]) {
    if (state.isPrivate || window.isPrivate) continue;
    for (const tab of window.tabs || []) {
      if (!tab.pinned && !tab.zenEssential) continue;
      let id;
      try {
        id = JSON.parse(tab.extData?.[KEY]);
      } catch {
        continue;
      }
      if (!wanted.has(id)) continue;
      const title =
        typeof tab.zenStaticLabel === "string" ? tab.zenStaticLabel : "";
      // Conflicting mirrored entries are ambiguous; never choose one arbitrarily.
      if (result.has(id) && result.get(id) !== title) result.set(id, null);
      else result.set(id, title);
    }
  }
  return result;
}

function enrichTabs(
  tabs,
  root = path.join(os.homedir(), "Library/Application Support/zen/Profiles"),
) {
  if (!Array.isArray(tabs)) return tabs;
  const wanted = new Set(tabs.filter((t) => t.pinned).map((t) => t.id));
  const titles = new Map();
  let profiles;
  try {
    profiles = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((p) => p.isDirectory());
  } catch {
    return tabs;
  }
  for (const profile of profiles) {
    const candidates = [
      "zen-sessions.jsonlz4",
      "sessionstore-backups/recovery.jsonlz4",
      "sessionstore.jsonlz4",
    ]
      .map((file) => path.join(root, profile.name, file))
      .flatMap((file) => {
        try {
          return [{ file, mtime: fs.statSync(file).mtimeMs }];
        } catch {
          return [];
        }
      })
      .sort((a, b) => b.mtime - a.mtime);
    // Use only the latest snapshot; older backups may contain obsolete names.
    if (!candidates.length) continue;
    try {
      const state = decode(fs.readFileSync(candidates[0].file));
      for (const [id, title] of savedTitles(state, wanted)) {
        if (titles.has(id) && titles.get(id) !== title) titles.set(id, null);
        else titles.set(id, title);
      }
    } catch {
      /* Missing, partial or unsupported session: retain the API title. */
    }
  }
  return tabs.map((tab) =>
    titles.get(tab.id)
      ? { ...tab, title: titles.get(tab.id), titleSource: "zen-session" }
      : tab,
  );
}
module.exports = { decode, savedTitles, enrichTabs, KEY };
