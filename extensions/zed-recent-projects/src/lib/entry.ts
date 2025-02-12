import { dirname, basename } from "path";
import { fileURLToPath } from "url";
import tildify from "tildify";

export interface Entry {
  uri: string;
  path: string;
  title: string;
  subtitle: string;
}

export function getEntry(uri: string): Entry | null {
  try {
    const path = fileURLToPath(uri);
    const title = decodeURIComponent(basename(uri));
    const subtitle = tildify(dirname(path));

    return {
      uri,
      path,
      title,
      subtitle,
    };
  } catch (e) {
    return null;
  }
}
