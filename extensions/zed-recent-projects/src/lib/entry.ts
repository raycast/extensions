import { dirname, basename } from "path";
import tildify from "tildify";
import { ZedEntry } from "./zedEntries";

export interface Entry {
  id: number;
  uri: string;
  path: string;
  title: string;
  subtitle: string;
  is_remote: boolean;
}

export function getEntry(entry: ZedEntry): Entry | null {
  try {
    const title = decodeURIComponent(basename(entry.path));
    const subtitle = tildify(dirname(entry.path)) + (entry.host ? " [SSH: " + entry.host + "]" : "");

    return {
      id: entry.id,
      uri: entry.uri,
      path: entry.path,
      title,
      subtitle,
      is_remote: !!entry.host,
    };
  } catch {
    return null;
  }
}
