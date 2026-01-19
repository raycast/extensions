import { showToast, Toast, showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default async function Command() {
  try {
    // Show loading toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Getting Brightness",
      message: "Reading current display brightness...",
    });

    // Execute brightness -l command to list current brightness
    try {
      const { stdout } = await execAsync("brightness -l");

      // Parse the output - format is typically:
      // display 0: brightness 0.500000
      const match = stdout.match(/brightness\s+([\d.]+)/);

      if (match && match[1]) {
        const brightnessValue = parseFloat(match[1]);
        const brightnessPercentage = Math.round(brightnessValue * 100);

        // Show as HUD for quick display
        await showHUD(`Display Brightness: ${brightnessPercentage}%`);
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Parse Error",
          message: "Could not parse brightness value",
        });
      }
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
      message: error instanceof Error ? error.message : "Failed to get brightness",
    });
  }
}
