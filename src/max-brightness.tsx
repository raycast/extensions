import { showHUD, showToast, Toast } from "@raycast/api";

import {
  isLunarInstalled,
  getDisplays,
  getCursorDisplay,
  getBrightnessForDisplay,
  setBrightnessForDisplay,
} from "./utils/lunar";

export default async function Command() {
  // Check if Lunar is installed
  const status = isLunarInstalled();

  if (!status.app || !status.cli) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Lunar Not Installed",
      message: !status.app
        ? "Install Lunar: brew install --cask lunar"
        : "Run: Lunar install-cli",
    });
    return;
  }

  try {
    // Get all displays
    const allDisplays = await getDisplays();

    if (allDisplays.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Displays Found",
        message: "Make sure Lunar is running and displays are connected",
      });
      return;
    }

    // Get the display where cursor is currently located
    const cursorDisplaySerial = await getCursorDisplay();

    // Find the target display (cursor display or fallback to main/first)
    let targetDisplay = allDisplays.find(
      (d) => d.serial === cursorDisplaySerial,
    );

    if (!targetDisplay) {
      // Fallback to main display or first display
      targetDisplay = allDisplays.find((d) => d.main) || allDisplays[0];
    }

    // Get current brightness for showing in HUD
    const currentBrightness = await getBrightnessForDisplay(
      targetDisplay.serial,
    );

    // Set brightness to 100%
    await setBrightnessForDisplay(
      targetDisplay.serial,
      100,
      targetDisplay.adaptive,
    );

    // Show confirmation HUD
    const oldValue = currentBrightness !== null ? `${currentBrightness}%` : "?";
    await showHUD(`🚀 ${targetDisplay.name}: ${oldValue} → 100%`);
  } catch (error) {
    console.error("Failed to set max brightness:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Set Brightness",
      message: error instanceof Error ? error.message : "An error occurred",
    });
  }
}
