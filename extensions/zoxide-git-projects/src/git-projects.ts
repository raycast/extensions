import execa = require("execa");
import { homedir } from "os";
import path from "path";
import { existsSync } from "fs";
import { LocalStorage } from "@raycast/api";

const CACHE_KEY = "git-projects-cache";
const POSSIBLE_ZOXIDE_PATHS = [
  "/opt/homebrew/bin/zoxide", // Apple Silicon Macs
  "/usr/local/bin/zoxide", // Intel Macs
  "/usr/bin/zoxide", // System-level installation
];

interface CacheData {
  projects: string[];
  timestamp: number;
}

async function findZoxidePath(): Promise<string> {
  const zoxidePath = POSSIBLE_ZOXIDE_PATHS.find((path) => existsSync(path));
  if (!zoxidePath) {
    throw new Error(
      "Zoxide not found. Please install it with 'brew install zoxide' or make sure it's in one of these locations:\n" +
        POSSIBLE_ZOXIDE_PATHS.join("\n"),
    );
  }
  return zoxidePath;
}

export async function getGitProjects(cacheTimeout: number): Promise<string[]> {
  if (cacheTimeout > 0) {
    const cachedDataStr = await LocalStorage.getItem<string>(CACHE_KEY);

    if (cachedDataStr) {
      const cachedData: CacheData = JSON.parse(cachedDataStr);
      const age = (Date.now() - cachedData.timestamp) / 1000; // Convert to seconds
      if (age < cacheTimeout) {
        console.debug("Returning cached projects, age:", Math.round(age), "seconds");
        return cachedData.projects;
      }
      console.debug("Cache expired, age:", Math.round(age), "seconds");
    }
  }

  try {
    const zoxidePath = await findZoxidePath();
    const { stdout: zoxideOutput } = await execa(zoxidePath, ["query", "-l"]);
    const directories = zoxideOutput.split("\n");

    const gitProjects = await Promise.all(
      directories.map(async (dir) => {
        try {
          const fullPath = dir.startsWith("~") ? dir.replace("~", homedir()) : dir;
          const { exitCode } = await execa("test", ["-d", path.join(fullPath, ".git")]);
          return exitCode === 0 ? dir : null;
        } catch {
          return null;
        }
      }),
    );

    const filteredProjects = gitProjects.filter((dir): dir is string => dir !== null);

    if (cacheTimeout > 0) {
      console.debug(`Caching ${filteredProjects.length} projects`);
      await LocalStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          projects: filteredProjects,
          timestamp: Date.now(),
        }),
      );
    }

    return filteredProjects;
  } catch (error) {
    console.error("Error getting git projects:", error);
    return [];
  }
}
