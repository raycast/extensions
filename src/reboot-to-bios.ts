import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

export default async function main() {
  try {
    // Create a batch file that minimizes itself before running
    const batPath = join(tmpdir(), "reboot_to_bios.bat");
    const batContent = `@echo off
if not DEFINED IS_MINIMIZED set IS_MINIMIZED=1 && start "" /min "%~f0" %* && exit
shutdown /r /fw /t 0
if %errorlevel% neq 0 (
    shutdown /r /o /t 0
)
`;
    await writeFile(batPath, batContent);

    // Launch via explorer.exe which properly requests admin privileges
    await execAsync(`explorer.exe "${batPath}"`);

    await showHUD("Rebooting to BIOS now...");
  } catch (error: unknown) {
    console.error(`exec error: ${error}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    await showHUD(`Failed: ${errorMessage}`);
  }
}
