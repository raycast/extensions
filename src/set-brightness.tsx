import { showToast, Toast, LaunchProps } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface SetBrightnessArguments {
  level: string;
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

    // Convert to 0-1 scale for the brightness command
    const brightnessValue = brightnessLevel / 100;

    // Show progress toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Setting Brightness",
      message: `Setting to ${brightnessLevel}%...`,
    });

    // Execute brightness command
    try {
      await execAsync(`brightness ${brightnessValue.toFixed(2)}`);

      await showToast({
        style: Toast.Style.Success,
        title: "Brightness Set",
        message: `Display brightness set to ${brightnessLevel}%`,
      });
    } catch (execError: any) {
      // Check if brightness tool is not installed
      if (execError.message.includes("command not found") || execError.message.includes("not found")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Brightness Tool Not Found",
          message: "Please install: brew install brightness",
        });
      } else {
        throw execError;
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
