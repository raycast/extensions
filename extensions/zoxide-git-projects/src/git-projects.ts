import execa = require("execa");
import { homedir } from "os";
import path from "path";
import { existsSync } from "fs";

const POSSIBLE_ZOXIDE_PATHS = [
  "/opt/homebrew/bin/zoxide", // Apple Silicon Macs
  "/usr/local/bin/zoxide", // Intel Macs
  "/usr/bin/zoxide", // System-level installation
];

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

export async function getGitProjects(): Promise<string[]> {
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

    return gitProjects.filter((dir): dir is string => dir !== null);
  } catch (error) {
    console.error("Error getting git projects:", error);
    throw error;
  }
}
