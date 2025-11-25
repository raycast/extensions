import { showHUD, confirmAlert, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

interface Preferences {
  showConfirmation: boolean;
}

async function executeReboot() {
  const batPath = join(tmpdir(), "reboot_to_bios.bat");
  const batContent = `@echo off
if not DEFINED IS_MINIMIZED set IS_MINIMIZED=1 && start "" /min "%~f0" %* && exit
shutdown /r /fw /t 0
`;
  await writeFile(batPath, batContent);

  // Show success message before executing, as the system will reboot immediately
  await showHUD("Rebooting to BIOS...");

  // Execute the batch file - ignore any errors as the system will be rebooting
  // and explorer.exe may not exit cleanly
  try {
    await execAsync(`explorer.exe "${batPath}"`);
  } catch {
    // Ignore errors - the reboot command works even if explorer.exe fails to return
  }
}

export default async function main() {
  try {
    const preferences = getPreferenceValues<Preferences>();

    if (preferences.showConfirmation) {
      const confirmed = await confirmAlert({
        title: "Confirm Reboot to BIOS",
        message:
          "Your computer will restart immediately and boot into BIOS firmware settings.\n\nAll unsaved work will be lost. Please save your work before continuing.\n\nTip: You can disable this confirmation in extension preferences for faster reboots.",
        primaryAction: {
          title: "Reboot Now",
        },
      });

      if (!confirmed) {
        await showHUD("Reboot cancelled");
        return;
      }
    }

    await executeReboot();
  } catch (error) {
    await showFailureToast(error, { title: "Failed to reboot to BIOS" });
  }
}
