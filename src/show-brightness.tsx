import { showHUD, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";

const execAsync = promisify(exec);

export default async function Command() {
  try {
    const lunarPath = `${homedir()}/.local/bin/lunar`;
    const { stdout } = await execAsync(`"${lunarPath}" get brightness`);
    
    // Parse the output - format is "0: Built-in\n\tbrightness: 50"
    const match = stdout.match(/brightness:\s*(\d+)/);
    
    if (match && match[1]) {
      const brightness = parseInt(match[1], 10);
      await showHUD(`☀️ Display Brightness: ${brightness}%`);
    } else {
      await showHUD("⚠️ Could not read brightness");
    }
  } catch (error: any) {
    if (error.message.includes("lunar") || error.message.includes("not found")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Lunar Not Installed",
        message: "Install Lunar: brew install --cask lunar",
      });
    } else {
      await showHUD("⚠️ Could not read brightness");
    }
  }
}
