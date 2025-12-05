import { showHUD, confirmAlert, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync, writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

interface Preferences {
  showConfirmation: boolean;
  rebootDelay: string;
}

const TASK_NAME = "RaycastRebootToBIOS";
const CANCEL_TASK_NAME = "RaycastCancelReboot";
const REBOOT_PENDING_FILE = join(tmpdir(), "raycast-reboot-to-bios-pending");

/** Check if system is running in UEFI mode */
async function isUEFIMode(): Promise<boolean> {
  try {
    // Check PEFirmwareType registry value: 1 = BIOS, 2 = UEFI
    const { stdout } = await execAsync(
      `powershell.exe -Command "(Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control' -Name 'PEFirmwareType' -ErrorAction SilentlyContinue).PEFirmwareType"`,
    );
    if (stdout.trim() === "2") return true;
    if (stdout.trim() === "1") return false;

    // Fallback: check bcdedit for EFI boot path
    const { stdout: bcdOutput } = await execAsync(`powershell.exe -Command "bcdedit | Select-String -Pattern 'path'"`);
    return bcdOutput.includes("\\EFI\\");
  } catch {
    // If we can't determine, assume UEFI and let the command fail with a clear error
    return true;
  }
}

/** Create marker file indicating reboot is pending */
function markRebootPending(): void {
  try {
    writeFileSync(REBOOT_PENDING_FILE, Date.now().toString());
  } catch {
    // Ignore errors
  }
}

/** Check if reboot is still pending (marker file exists) */
function isRebootPending(): boolean {
  return existsSync(REBOOT_PENDING_FILE);
}

/** Clear the pending marker */
function clearRebootPending(): void {
  try {
    if (existsSync(REBOOT_PENDING_FILE)) {
      unlinkSync(REBOOT_PENDING_FILE);
    }
  } catch {
    // Ignore errors
  }
}

/** Execute reboot to BIOS via Task Scheduler (bypasses Raycast sandbox) */
async function executeRebootToBIOS(delay: number): Promise<void> {
  // Clean up any existing task
  try {
    await execAsync(`schtasks /delete /tn "${TASK_NAME}" /f`);
  } catch {
    // Task didn't exist, that's fine
  }

  // Create elevated one-time task with the delay built into shutdown command
  // This allows shutdown /a to cancel during the countdown period
  await execAsync(
    `schtasks /create /tn "${TASK_NAME}" /tr "shutdown /r /fw /t ${delay}" /sc once /st 00:00 /sd 01/01/2000 /rl HIGHEST /f`,
  );

  // Run immediately
  await execAsync(`schtasks /run /tn "${TASK_NAME}"`);

  // Mark reboot as pending
  markRebootPending();

  // Clean up task entry after a short delay (shutdown is already scheduled)
  setTimeout(async () => {
    try {
      await execAsync(`schtasks /delete /tn "${TASK_NAME}" /f`);
    } catch {
      // Ignore cleanup errors
    }
  }, 2000);
}

/** Execute shutdown /a via Task Scheduler (bypasses Raycast sandbox) */
async function executeCancelReboot(): Promise<void> {
  try {
    await execAsync(`schtasks /delete /tn "${CANCEL_TASK_NAME}" /f`);
  } catch {
    // Task didn't exist
  }

  await execAsync(
    `schtasks /create /tn "${CANCEL_TASK_NAME}" /tr "shutdown /a" /sc once /st 00:00 /sd 01/01/2000 /rl HIGHEST /f`,
  );
  await execAsync(`schtasks /run /tn "${CANCEL_TASK_NAME}"`);

  // Clear the pending marker so the other command's toast knows
  clearRebootPending();

  setTimeout(async () => {
    try {
      await execAsync(`schtasks /delete /tn "${CANCEL_TASK_NAME}" /f`);
    } catch {
      // Ignore
    }
  }, 2000);
}

/** Schedule reboot and show Toast with Cancel button */
async function showCountdownAndReboot(delay: number): Promise<void> {
  // Schedule the shutdown with the delay built-in
  // This makes shutdown /a work during the countdown
  await executeRebootToBIOS(delay);

  return new Promise((resolve) => {
    let remaining = delay;
    let cancelled = false;

    showToast({
      style: Toast.Style.Animated,
      title: "Rebooting to BIOS",
      message: `⏳ ${remaining} seconds remaining...`,
      primaryAction: {
        title: "Cancel",
        onAction: async (toast) => {
          cancelled = true;
          try {
            await executeCancelReboot();
            toast.style = Toast.Style.Success;
            toast.title = "Reboot Cancelled";
            toast.message = "Operation aborted";
            // Hide toast after showing success message
            setTimeout(() => toast.hide(), 2000);
          } catch {
            toast.style = Toast.Style.Failure;
            toast.title = "Cancel Failed";
            toast.message = "Could not abort reboot";
          }
          resolve();
        },
      },
    }).then((toast) => {
      // Update countdown every second
      const interval = setInterval(() => {
        if (cancelled) {
          clearInterval(interval);
          return;
        }

        // Check if reboot was cancelled externally (via Cancel Reboot command)
        if (!isRebootPending()) {
          clearInterval(interval);
          cancelled = true;
          toast.style = Toast.Style.Success;
          toast.title = "Reboot Cancelled";
          toast.message = "Cancelled via shortcut";
          setTimeout(() => toast.hide(), 2000);
          resolve();
          return;
        }

        remaining--;

        if (remaining <= 0) {
          clearInterval(interval);
          clearRebootPending();
          toast.style = Toast.Style.Success;
          toast.title = "Rebooting Now";
          toast.message = "🔄 Entering BIOS...";
          // Hide toast after a short delay - system will reboot
          setTimeout(() => toast.hide(), 2000);
          resolve();
        } else {
          toast.message = `⏳ ${remaining} seconds remaining...`;
        }
      }, 1000);
    });
  });
}

export default async function main() {
  const preferences = getPreferenceValues<Preferences>();

  // Show confirmation dialog if enabled
  if (preferences.showConfirmation) {
    const confirmed = await confirmAlert({
      title: "Reboot to BIOS",
      message: "Your computer will restart and boot into BIOS/UEFI settings.\n\nSave your work before continuing.",
      primaryAction: { title: "Reboot Now" },
    });

    if (!confirmed) {
      await showHUD("Reboot cancelled");
      return;
    }
  }

  // Check UEFI support
  if (!(await isUEFIMode())) {
    await showFailureToast("This feature requires UEFI firmware. Your system appears to use legacy BIOS.", {
      title: "UEFI Required",
    });
    return;
  }

  const delay = parseInt(preferences.rebootDelay, 10) || 10;

  try {
    // For delays >= 3s, show countdown with cancel button, then reboot
    if (delay >= 3) {
      await showCountdownAndReboot(delay);
    } else {
      // For short/immediate delays, just execute directly
      await executeRebootToBIOS(delay);
      if (delay > 0) {
        await showHUD("🔄 Rebooting to BIOS...");
      } else {
        await showHUD("🔄 Rebooting to BIOS now...");
      }
    }
  } catch {
    await showFailureToast(
      "Failed to schedule reboot. Try running 'shutdown /r /fw /t 10' in an elevated Command Prompt.",
      { title: "Reboot Failed" },
    );
  }
}
