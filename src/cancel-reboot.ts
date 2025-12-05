import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

const TASK_NAME = "RaycastCancelReboot";
const REBOOT_PENDING_FILE = join(tmpdir(), "raycast-reboot-to-bios-pending");

/** Check if a reboot is currently pending */
function isRebootPending(): boolean {
  return existsSync(REBOOT_PENDING_FILE);
}

/** Clear the pending marker so the reboot command's toast knows to update */
function clearRebootPending(): void {
  try {
    if (existsSync(REBOOT_PENDING_FILE)) {
      unlinkSync(REBOOT_PENDING_FILE);
    }
  } catch {
    // Ignore errors
  }
}

/** Execute shutdown /a via Task Scheduler (bypasses Raycast sandbox) */
async function executeCancelReboot(): Promise<void> {
  // Clean up any existing task
  try {
    await execAsync(`schtasks /delete /tn "${TASK_NAME}" /f`);
  } catch {
    // Task didn't exist, that's fine
  }

  // Create elevated one-time task to abort shutdown
  await execAsync(
    `schtasks /create /tn "${TASK_NAME}" /tr "shutdown /a" /sc once /st 00:00 /sd 01/01/2000 /rl HIGHEST /f`,
  );

  // Run immediately
  await execAsync(`schtasks /run /tn "${TASK_NAME}"`);

  // Clear the pending marker so the reboot toast detects cancellation
  clearRebootPending();

  // Clean up task entry after a short delay
  setTimeout(async () => {
    try {
      await execAsync(`schtasks /delete /tn "${TASK_NAME}" /f`);
    } catch {
      // Ignore cleanup errors
    }
  }, 2000);
}

/** Cancel any pending reboot to BIOS */
export default async function main() {
  // Check if a reboot was scheduled via this extension
  if (!isRebootPending()) {
    await showHUD("ℹ️ No scheduled reboot");
    return;
  }

  try {
    await executeCancelReboot();
    await showHUD("✅ Reboot cancelled");
  } catch {
    await showHUD("⚠️ Failed to cancel reboot");
  }
}
