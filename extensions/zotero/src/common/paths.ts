import { join } from "path";

// Expand a leading ~ to the user's home directory (zotero_path and bibtex_path
// are commonly saved that way).
export function resolveHome(filepath: string): string {
  if (filepath[0] === "~") {
    return join(process.env.HOME, filepath.slice(1));
  }
  return filepath;
}
