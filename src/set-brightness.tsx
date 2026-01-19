import { showToast, Toast, showHUD, LaunchProps } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface SetBrightnessArguments {
  level: string;
}

// AppleScript to set brightness using keyboard simulation
async function setBrightnessWithKeys(targetLevel: number): Promise<void> {
  // First, get current brightness to calculate steps
  let currentBrightness = 50; // Default assumption
  
  try {
    const { stdout } = await execAsync("brightness -l 2>/dev/null | grep -oE '[0-9.]+$'");
    const value = parseFloat(stdout.trim());
    if (!isNaN(value)) {
      currentBrightness = Math.round(value * 100);
    }
  } catch {
    // If we can't get current brightness, start from middle
  }

  const diff = targetLevel - currentBrightness;
  const steps = Math.abs(diff);
  const keyCode = diff > 0 ? 144 : 145; // 144 = brightness up, 145 = brightness down

  if (steps === 0) {
    return;
  }

  // Press the brightness key multiple times
  const script = `repeat ${steps} times\n  tell application "System Events" to key code ${keyCode}\n  delay 0.05\nend repeat`;
  
  await execAsync(`osascript -e '${script}'`);
}

export default async function Command(props: LaunchProps<{ arguments: SetBrightnessArguments }>) {
  const { level } = props.arguments;

  try {
    // Validate input
    const brightnessLevel = parseInt(level, 10);

    if (isNaN(brightnessLevel)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Input",
        message: "Please enter a number between 1 and 100",
      });
      return;
    }

    if (brightnessLevel < 1 || brightnessLevel > 100) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Out of Range",
        message: "Brightness must be between 1 and 100",
      });
      return;
    }

    // Show progress
    await showToast({
      style: Toast.Style.Animated,
      title: "Setting Brightness",
      message: `Setting to ${brightnessLevel}%...`,
    });

    try {
      await setBrightnessWithKeys(brightnessLevel);
      await showHUD(`✓ Brightness set to ${brightnessLevel}%`);
    } catch (error: any) {
      if (error.message.includes("not allowed")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Permission Required",
          message: "Grant Raycast Accessibility permission in System Settings",
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "Failed to set brightness",
    });
  }
}
