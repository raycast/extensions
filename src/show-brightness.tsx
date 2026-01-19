import { showToast, Toast, showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default async function Command() {
  try {
    // Show loading
    await showToast({
      style: Toast.Style.Animated,
      title: "Getting Brightness",
    });

    // Try to get brightness using the brightness tool
    try {
      const { stdout } = await execAsync("brightness -l 2>&1");

      // Parse the output - format is typically:
      // display 0: brightness 0.500000
      const match = stdout.match(/brightness\s+([\d.]+)/);

      if (match && match[1]) {
        const brightnessValue = parseFloat(match[1]);
        const brightnessPercentage = Math.round(brightnessValue * 100);

        // Show as HUD for quick display
        await showHUD(`☀️ Display Brightness: ${brightnessPercentage}%`);
      } else if (stdout.includes("failed to get brightness")) {
        // XDR display - brightness tool doesn't work
        await showHUD("⚠️ Brightness reading not supported on XDR displays");
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Read Brightness",
          message: "Unable to parse brightness value",
        });
      }
    } catch (execError: any) {
      // Check if brightness tool is not installed
      if (execError.message.includes("command not found") || execError.message.includes("not found")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Brightness Tool Not Found",
          message: "Install with: brew install brightness",
        });
      } else {
        // Likely XDR display issue
        await showHUD("⚠️ Brightness reading not available");
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
