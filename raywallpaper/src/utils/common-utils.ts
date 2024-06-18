import { runAppleScript } from "@raycast/utils";
import fs from "fs";
import path from "path";
import { scriptSetWallpaper } from "./applescript-utils";

export function getFilesInDirectory(directory: string) {
  try {
    return fs
      .readdirSync(directory)
      .map((file) => path.join(directory, file))
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return ext === ".jpg" || ext === ".png" || ext === ".heic" || ext === ".jpeg";
      });
  } catch (err) {
    console.error(`Error reading directory: ${err}`);
    return [];
  }
}

export async function setWallpaper(file: string) {
  await runAppleScript(scriptSetWallpaper(file));
}
