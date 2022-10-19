import { execFile } from "child_process";
import { promisify } from "node:util";
import fs from "node:fs"
import { environment } from "@raycast/api";

const execFileP = promisify(execFile);
const assetsPath = environment.assetsPath + "/PlayCoverCLI";
const supportPath = environment.supportPath + "/PlayCoverCLI"
const binary = environment.supportPath + "/PlayCoverCLI/PlayCoverCLI"

export async function useSideload (applicationPath:string) {
  if (process.platform !== 'darwin') {
    throw new Error('macOS only');
  }
  const isOnSupportFolder = fs.existsSync(binary)
  if (!isOnSupportFolder) {
    fs.mkdirSync(supportPath, { recursive: true })
    // move binary to support folder keeping it executable 
    fs.copyFileSync(assetsPath + "/PlayCoverCLI", binary)
    fs.chmodSync(binary, 0o755)

  }
  // check if application exists
  const isApplicationExists = fs.existsSync(applicationPath)
  if (!isApplicationExists) {
    throw new Error('Application not found');
  }
  const { stdout } = await execFileP(binary, [applicationPath]);
  return stdout;
}