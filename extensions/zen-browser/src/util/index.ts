import { getPreferenceValues } from "@raycast/api";
import { executeSQL } from "@raycast/utils";
import { HistoryEntry } from "../interfaces";
import fs from "fs";
import path from "path";

const userDataDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  const preferences = getPreferenceValues<Preferences>();
  if (preferences.profilesDirectory) {
    return preferences.profilesDirectory;
  }

  if (process.platform == "darwin") {
    return path.join(process.env.HOME, "Library", "Application Support", "zen", "Profiles");
  } else {
    return path.join(process.env.HOME, "AppData", "Roaming", "zen", "Profiles");
  }
};

const getProfileName = (userDirectoryPath: string) => {
  const profiles = fs.readdirSync(userDirectoryPath);
  const preferences = getPreferenceValues();

  const customProfile = profiles.filter((profile) => profile.endsWith(preferences.profileDirectorySuffix))[0];
  if (customProfile) return customProfile;

  const releaseProfile = profiles.filter((profile) => profile.endsWith(".Default (release)"))[0];
  if (releaseProfile) return releaseProfile;

  const betaProfile = profiles.filter((profile) => profile.endsWith(".Default (beta)"))[0];
  if (betaProfile) return betaProfile;

  const alphaProfile = profiles.filter((profile) => profile.endsWith(".Default (alpha)"))[0];
  if (alphaProfile) return alphaProfile;

  const anyDefaultProfile = profiles.filter((profile) => profile.includes(".Default ("))[0];
  if (anyDefaultProfile) return anyDefaultProfile;

  return "";
};

// TODO: Use shortcuts from zen-keyboard-shortcuts.json instead
export const getNewTabShortcut = () => {
  const preferences = getPreferenceValues();
  const key = preferences.newTabShortcut
    .trim()
    .charAt(preferences.newTabShortcut.length - 1)
    .toLowerCase();
  const finalShortcutString = `keystroke "${key}" using `;
  const finalCommandsString = getCommands(preferences.newTabShortcut);

  return finalShortcutString + finalCommandsString; // Converting the commands to an apple script string for the shortcut
};

const getCommands = (newTabShortcut: string): string => {
  if (!newTabShortcut) return "{command down}";
  if (newTabShortcut.includes("hyper")) return "{command down, option down, control down, shift down}";

  const commandMap: Record<string, string> = {
    cmd: "command",
    command: "command",
    ctrl: "control",
    control: "control",
    opt: "option",
    option: "option",
    shift: "shift",
    alt: "option",
    super: "command",
  };

  const finalCommands = Object.entries(commandMap)
    .filter(([key]) => newTabShortcut.includes(key))
    .map(([, value]) => `${value} down`);

  return "{" + finalCommands.join(", ") + "}";
};

export const getPlacesDbPath = (): string => {
  const userDirectoryPath = userDataDirectoryPath();
  return path.join(userDirectoryPath, getProfileName(userDirectoryPath), "places.sqlite");
};

export const getShorcutsJsonPath = (): string => {
  const userDirectoryPath = userDataDirectoryPath();
  return path.join(userDirectoryPath, getProfileName(userDirectoryPath), "zen-keyboard-shortcuts.json");
};

const whereClauses = (terms: string[]) => {
  return terms.map((t) => `moz_places.title LIKE '%${t}%'`).join(" AND ");
};

export const getHistoryQuery = (query?: string, limitResults?: number) => {
  const preferences = getPreferenceValues();
  const terms = query ? query.trim().split(" ") : [];
  const whereClause = terms.length > 0 ? `WHERE ${whereClauses(terms)}` : "";

  return `SELECT
            id, url, title,
            datetime(last_visit_date/1000000,'unixepoch') as lastVisited
          FROM moz_places
          ${whereClause}
          ORDER BY last_visit_date DESC LIMIT ${limitResults ? limitResults : preferences.limitResults};`;
};

export const getHistory = async (query?: string, limitResults?: number) => {
  const inQuery = getHistoryQuery(query, limitResults);
  const dbPath = getPlacesDbPath();

  if (!fs.existsSync(dbPath)) {
    return "Zen Browser is not installed.";
  }

  return await executeSQL<HistoryEntry>(dbPath, inQuery);
};

export const getBookmarksDirectoryPath = (): string => {
  const userDirectoryPath = userDataDirectoryPath();
  return path.join(userDirectoryPath, getProfileName(userDirectoryPath), "bookmarkbackups");
};

export const getSessionManagerExtensionPath = (extensionId: string) => {
  const userDirectoryPath = userDataDirectoryPath();
  return path.join(
    userDirectoryPath,
    getProfileName(userDirectoryPath),
    "storage",
    "default",
    `moz-extension+++${extensionId}`,
    "idb",
  );
};

export const getSessionInactivePath = async () => {
  const userDirectoryPath = userDataDirectoryPath();
  return path.join(userDirectoryPath, getProfileName(userDirectoryPath), "sessionstore.jsonlz4");
};

export const getSessionActivePath = async () => {
  const userDirectoryPath = userDataDirectoryPath();
  return path.join(
    userDirectoryPath,
    await getProfileName(userDirectoryPath),
    "sessionstore-backups",
    "recovery.jsonlz4",
  );
};

export function decodeLZ4(buffer: Buffer) {
  const u8sz = buffer.slice(8, 12);
  const origLen = u8sz[0] + u8sz[1] * 256 + u8sz[2] * 256 * 256 + u8sz[3] * 256 * 256 * 256;
  // Extract compressed data (past mozilla jsonlz4 header of 12 bytes)
  const jsonStart = 12;
  const u8Comp = buffer.slice(jsonStart);
  // Create LZ4 buffer
  const comp = Buffer.from(u8Comp);
  const orig = Buffer.alloc(origLen);
  // perform lz4 decompression
  const decompressedLen = decodeBlock(comp, orig);
  const data = orig.subarray(0, decompressedLen);
  return JSON.parse(data.toString());
}

function decodeBlock(input: Buffer, output: Buffer, sIdx?: number, eIdx?: number): number {
  sIdx = sIdx || 0;
  eIdx = eIdx || input.length - sIdx;
  let a: number = 0;
  // Process each sequence in the incoming data
  for (let i = sIdx, n = eIdx, j = 0; i < n; ) {
    a = j;
    const token = input[i++];

    // Literals
    let literals_length = token >> 4;
    if (literals_length > 0) {
      // length of literals
      let l = literals_length + 240;
      while (l === 255) {
        l = input[i++];
        literals_length += l;
      }

      // Copy the literals
      const end = i + literals_length;
      while (i < end) output[j++] = input[i++];

      // End of buffer?
      if (i === n) return j;
    }

    // Match copy
    // 2 bytes offset (little endian)
    const offset = input[i++] | (input[i++] << 8);

    // 0 is an invalid offset value
    if (offset === 0 || offset > j) return -(i - 2);

    // length of match copy
    let match_length = token & 0xf;
    let l = match_length + 240;
    while (l === 255) {
      l = input[i++];
      match_length += l;
    }

    // Copy the match
    let pos = j - offset; // position of the match copy in the current output
    const end = j + match_length + 4; // minmatch = 4
    while (j < end) output[j++] = output[pos++];
  }

  return a;
}
