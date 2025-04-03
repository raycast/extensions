import * as fs from "fs";
import { execFile } from "child_process";
import { fileURLToPath } from "url";
import * as path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// From https://github.com/raycast/extensions/blob/main/extensions/visual-studio-code-recent-projects/src/utils/git.ts
export async function getGitBranch(directoryPath: string): Promise<string | null> {
  try {
    // If it's a file URL, convert it to a file path
    if (directoryPath.startsWith("file://")) {
      directoryPath = fileURLToPath(directoryPath);
    }

    // If it's a file path, get its directory
    const stats = await fs.promises.stat(directoryPath);
    if (!stats.isDirectory()) {
      directoryPath = path.dirname(directoryPath);
    }

    // Check if .git directory exists
    const gitDir = path.join(directoryPath, ".git");
    const isGitRepo = await fs.promises
      .access(gitDir)
      .then(() => true)
      .catch(() => false);

    if (!isGitRepo) {
      return null;
    }

    // Run git command to get current branch
    const { stdout } = await execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: directoryPath,
      encoding: "utf-8",
    });

    const branch = stdout.trim();
    return branch || null;
  } catch (error) {
    // Only throw error if it's not the common "not a git repository" error and not the "ambiguous argument 'HEAD'" error
    if (
      error instanceof Error &&
      !error.message.includes("not a git repository") &&
      !error.message.includes("ambiguous argument 'HEAD'")
    ) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(message);
    }
    return null;
  }
}
