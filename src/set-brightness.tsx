import { showToast, Toast, showHUD, LaunchProps, LocalStorage } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";

const execAsync = promisify(exec);

interface SetBrightnessArguments {
  level: string;
}

// Set brightness using Lunar CLI
async function setBrightnessWithLunar(level: number): Promise<void> {
  const lunarPath = `${homedir()}/.local/bin/lunar`;
  await execAsync(`"${lunarPath}" set brightness ${level}`);
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
      await setBrightnessWithLunar(brightnessLevel);
      // Store the brightness value for the "Show Brightness" command
      await LocalStorage.setItem("lastBrightness", brightnessLevel.toString());
      await showHUD(`✓ Brightness set to ${brightnessLevel}%`);
    } catch (error: any) {
      if (error.message.includes("lunar") || error.message.includes("not found")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Lunar Not Installed",
          message: "Install Lunar: brew install --cask lunar",
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
