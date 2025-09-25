import os from "os";
import path from "path";
import { TILE_COLORS_BY_INDEX } from "./constants";

export function expandTilde(inputPath: string) {
  if (inputPath.startsWith("~")) {
    // Get the home directory
    const homeDir = os.homedir();
    // Replace '~' with the home directory
    return path.join(homeDir, inputPath.slice(1));
  }
  return inputPath;
}

export function getTileColorByIndex(index: number) {
  return TILE_COLORS_BY_INDEX[index];
}
