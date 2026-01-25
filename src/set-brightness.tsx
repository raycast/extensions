import {
  showToast,
  Toast,
  showHUD,
  LocalStorage,
  Form,
  ActionPanel,
  Action,
  useNavigation,
  Detail,
} from "@raycast/api";
import * as React from "react";
import { useEffect, useState } from "react";

import {
  DisplayInfo,
  isLunarInstalled,
  installLunarCLI,
  getDisplays,
  getCursorDisplay,
  getBrightnessForDisplay,
  getBrightnessWithLunar,
  setAdaptiveMode,
  setBrightnessForDisplay,
} from "./utils/lunar";

interface BrightnessFormValues {
  level: string;
  display: string;
}

export default function Command() {
  const [currentBrightness, setCurrentBrightness] = useState<number | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [lunarStatus, setLunarStatus] = useState<{
    app: boolean;
    cli: boolean;
  } | null>(null);
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [selectedDisplay, setSelectedDisplay] = useState<string>("");
  const { pop } = useNavigation();

  // Check Lunar installation and fetch current brightness on load
  useEffect(() => {
    async function initialize() {
      const status = isLunarInstalled();
      setLunarStatus(status);

      if (status.app && status.cli) {
        try {
          // Get all displays (with built-in retry logic)
          const allDisplays = await getDisplays();
          setDisplays(allDisplays);

          if (allDisplays.length === 0) {
            console.error("No active displays found after retries");
            await showToast({
              style: Toast.Style.Failure,
              title: "No Displays Found",
              message: "Make sure Lunar is running and displays are connected",
            });
            setIsLoading(false);
            return;
          }

          // Get the display where cursor is currently located (with built-in retry logic)
          const cursorDisplaySerial = await getCursorDisplay();

          // Verify the cursor display is in our list
          const cursorDisplayExists =
            cursorDisplaySerial &&
            allDisplays.some((d) => d.serial === cursorDisplaySerial);

          if (cursorDisplayExists) {
            // Set the cursor display as selected
            console.log(
              `Detected cursor on display: ${allDisplays.find((d) => d.serial === cursorDisplaySerial)?.name}`,
            );
            setSelectedDisplay(cursorDisplaySerial!);

            // Get brightness for the cursor display (with built-in retry logic)
            const brightness = await getBrightnessForDisplay(
              cursorDisplaySerial!,
            );
            setCurrentBrightness(brightness);
          } else {
            // Fallback to main display or first display
            const mainDisplay =
              allDisplays.find((d) => d.main) || allDisplays[0];
            console.log(
              `Cursor detection failed or not in list, falling back to ${mainDisplay.name}`,
            );
            setSelectedDisplay(mainDisplay.serial);
            setCurrentBrightness(mainDisplay.brightness);
          }
        } catch (error) {
          console.error("Failed to initialize displays:", error);
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to Load Displays",
            message:
              error instanceof Error
                ? error.message
                : "Please try reopening the command",
          });
        }
      }
      setIsLoading(false);
    }
    initialize();
  }, []);

  // Handle display selection change
  async function handleDisplayChange(newDisplaySerial: string) {
    setSelectedDisplay(newDisplaySerial);

    // Update current brightness for the newly selected display
    try {
      const brightness = await getBrightnessForDisplay(newDisplaySerial);
      setCurrentBrightness(brightness);
    } catch (error) {
      console.error("Failed to get brightness for display:", error);
      const display = displays.find((d) => d.serial === newDisplaySerial);
      if (display) {
        setCurrentBrightness(display.brightness);
      }
    }
  }

  // Handle toggling sync mode
  async function handleSyncModeChange(newValue: boolean) {
    if (!selectedDisplay) {
      return;
    }

    const displayInfo = displays.find((d) => d.serial === selectedDisplay);
    if (!displayInfo) {
      return;
    }

    const action = newValue ? "Enabling" : "Disabling";

    await showToast({
      style: Toast.Style.Animated,
      title: `${action} Sync`,
      message: `${action} sync mode for ${displayInfo.name}...`,
    });

    try {
      await setAdaptiveMode(selectedDisplay, newValue);

      // Refresh display list to get updated adaptive state
      const updatedDisplays = await getDisplays();
      setDisplays(updatedDisplays);

      await showToast({
        style: Toast.Style.Success,
        title: "Sync Mode Updated",
        message: `Sync is now ${newValue ? "enabled" : "disabled"} for ${displayInfo.name}`,
      });
    } catch (error) {
      console.error("Failed to toggle sync mode:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Toggle Sync",
        message: error instanceof Error ? error.message : "An error occurred",
      });
      // Refresh to revert UI state on error
      const updatedDisplays = await getDisplays();
      setDisplays(updatedDisplays);
    }
  }

  async function handleSubmit(values: BrightnessFormValues) {
    try {
      // Validate input
      let brightnessLevel = parseInt(values.level, 10);

      if (isNaN(brightnessLevel)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Input",
          message: "Please enter a number",
        });
        return;
      }

      if (brightnessLevel < 1) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Out of Range",
          message: "Brightness must be at least 1",
        });
        return;
      }

      // Handle values greater than 100 - clamp to 100 and show special message
      let showMaxMessage = false;
      if (brightnessLevel > 100) {
        brightnessLevel = 100;
        showMaxMessage = true;
      }

      // Show progress
      await showToast({
        style: Toast.Style.Animated,
        title: "Setting Brightness",
        message: `Setting to ${brightnessLevel}%...`,
      });

      try {
        // Use selected display or fallback
        if (!selectedDisplay) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No Display Selected",
            message: "Please select a display",
          });
          return;
        }

        const displayInfo = displays.find((d) => d.serial === selectedDisplay);
        const displayName = displayInfo?.name || "Display";

        // Set brightness with retry and verification (will auto-disable adaptive mode if needed)
        await setBrightnessForDisplay(
          selectedDisplay,
          brightnessLevel,
          displayInfo?.adaptive || false,
        );

        // Store the brightness value for reference
        await LocalStorage.setItem(
          "lastBrightness",
          brightnessLevel.toString(),
        );

        // Show old → new brightness in HUD with display name
        const oldValue =
          currentBrightness !== null ? `${currentBrightness}%` : "?";
        if (showMaxMessage) {
          await showHUD(`🚀 ${displayName}: Brightness to the max!`);
        } else {
          await showHUD(`☀️ ${displayName}: ${oldValue} → ${brightnessLevel}%`);
        }

        // Close the form
        pop();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes("lunar") ||
          errorMessage.includes("not found")
        ) {
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
        message:
          error instanceof Error ? error.message : "Failed to set brightness",
      });
    }
  }

  // Handle Lunar CLI installation
  async function handleInstallCLI() {
    await showToast({
      style: Toast.Style.Animated,
      title: "Installing Lunar CLI",
      message: "This will take a few seconds...",
    });

    const success = await installLunarCLI();
    if (success) {
      await showToast({
        style: Toast.Style.Success,
        title: "Lunar CLI Installed",
        message: "You can now use the extension!",
      });
      // Refresh the status
      const status = isLunarInstalled();
      setLunarStatus(status);
      if (status.cli) {
        const brightness = await getBrightnessWithLunar();
        setCurrentBrightness(brightness);
      }
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Installation Failed",
        message: "Please try installing manually",
      });
    }
  }

  // If Lunar is not installed, show installation guide
  if (!isLoading && lunarStatus && (!lunarStatus.app || !lunarStatus.cli)) {
    const markdown = `# Lunar Setup Required

This extension requires [Lunar](https://lunar.fyi/) to control display brightness.

## Installation Status

- Lunar App: ${lunarStatus.app ? "✅ Installed" : "❌ Not Installed"}
- Lunar CLI: ${lunarStatus.cli ? "✅ Installed" : "❌ Not Installed"}

## What to do:

${
  !lunarStatus.app
    ? `### 1. Install Lunar App

Click "Install Lunar" below to open the installation page, or run:

\`\`\`bash
brew install --cask lunar
\`\`\`

After installation, restart this command.`
    : ""
}

${
  lunarStatus.app && !lunarStatus.cli
    ? `### Install Lunar CLI

Click "Install CLI" below to automatically install the Lunar CLI.

Or run this command manually:

\`\`\`bash
/Applications/Lunar.app/Contents/MacOS/Lunar install-cli
\`\`\`
`
    : ""
}

**Lunar is free** for basic brightness control!
`;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            {!lunarStatus.app && (
              <>
                <Action.Open
                  title="Install Lunar"
                  target="https://lunar.fyi/"
                />
                <Action.Open
                  title="Install Via Homebrew"
                  target="x-man-page://brew"
                />
              </>
            )}
            {lunarStatus.app && !lunarStatus.cli && (
              <Action title="Install Lunar Cli" onAction={handleInstallCLI} />
            )}
          </ActionPanel>
        }
      />
    );
  }

  const selectedDisplayInfo = displays.find(
    (d) => d.serial === selectedDisplay,
  );
  const displayNameText = selectedDisplayInfo
    ? `${selectedDisplayInfo.name}${selectedDisplayInfo.main ? " (Main)" : ""}`
    : displays.length > 0
      ? "Select a display"
      : "No displays found";

  const currentBrightnessText = isLoading
    ? "Loading..."
    : currentBrightness !== null
      ? `${currentBrightness}%`
      : "Unknown";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Brightness" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {displays.length > 0 && (
        <Form.Dropdown
          id="display"
          title="Display"
          value={selectedDisplay}
          onChange={handleDisplayChange}
        >
          {displays.map((display) => (
            <Form.Dropdown.Item
              key={display.serial}
              value={display.serial}
              title={`${display.name}${display.main ? " (Main)" : ""}`}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.Description title="Current Display" text={displayNameText} />
      <Form.Description
        title="Current Brightness"
        text={currentBrightnessText}
      />
      <Form.Separator />
      {selectedDisplayInfo && !selectedDisplayInfo.main && (
        <Form.Checkbox
          id="syncMode"
          label="Sync with other displays"
          value={selectedDisplayInfo.adaptive}
          onChange={handleSyncModeChange}
          info="When enabled, this display's brightness will automatically follow your main display"
        />
      )}
      <Form.TextField
        id="level"
        title="New Brightness"
        placeholder="1-100"
        info="Enter a value between 1 and 100"
      />
    </Form>
  );
}
