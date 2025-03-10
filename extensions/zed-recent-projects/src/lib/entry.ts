import { dirname, basename } from "path";
import { fileURLToPath } from "url";
import tildify from "tildify";
import { ZedEntry } from "./zedEntries";

export interface Entry {
  uri: string;
  path: string;
  title: string;
  subtitle: string;
  is_remote: boolean;
}

export function getEntryFromVSCodeEntryUri(uri: string): Entry | null {
  try {
    const path = fileURLToPath(uri);
    const title = decodeURIComponent(basename(uri));
    const subtitle = tildify(dirname(path));

    return {
      uri,
      path,
      title,
      subtitle,
      is_remote: false,
    };
  } catch (e) {
    return null;
  }
}

export function getEntry(entry: ZedEntry): Entry | null {
  try {
    const title = decodeURIComponent(basename(entry.path));
    const subtitle = tildify(dirname(entry.path)) + (entry.host ? " [SSH: " + entry.host + "]" : "");

    return {
      uri: entry.uri,
      path: entry.path,
      title,
      subtitle,
      is_remote: !!entry.host,
    };
  } catch (e) {
    return null;
  }
}
