import { showToast, Toast, showHUD, LocalStorage, Form, ActionPanel, Action, useNavigation, Detail, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { existsSync } from "fs";

const execAsync = promisify(exec);

interface BrightnessFormValues {
  level: string;
}

// Get current brightness using Lunar CLI
async function getBrightnessWithLunar(): Promise<number | null> {
  try {
    const lunarPath = `${homedir()}/.local/bin/lunar`;
    const { stdout } = await execAsync(`"${lunarPath}" get brightness`);
    const match = stdout.match(/brightness:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  } catch (error) {
    return null;
  }
}

// Set brightness using Lunar CLI
async function setBrightnessWithLunar(level: number): Promise<void> {
  const lunarPath = `${homedir()}/.local/bin/lunar`;
  await execAsync(`"${lunarPath}" set brightness ${level}`);
}

// Check if Lunar is installed
function isLunarInstalled(): { app: boolean; cli: boolean } {
  const appInstalled = existsSync("/Applications/Lunar.app");
  const cliInstalled = existsSync(`${homedir()}/.local/bin/lunar`);
  return { app: appInstalled, cli: cliInstalled };
}

// Install Lunar CLI
async function installLunarCLI(): Promise<boolean> {
  try {
    await execAsync("/Applications/Lunar.app/Contents/MacOS/Lunar install-cli");
    return true;
  } catch (error) {
    return false;
  }
}

export default function Command() {
  const [currentBrightness, setCurrentBrightness] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lunarStatus, setLunarStatus] = useState<{ app: boolean; cli: boolean } | null>(null);
  const { pop } = useNavigation();

  // Check Lunar installation and fetch current brightness on load
  useEffect(() => {
    async function initialize() {
      const status = isLunarInstalled();
      setLunarStatus(status);

      if (status.app && status.cli) {
        try {
          const brightness = await getBrightnessWithLunar();
          setCurrentBrightness(brightness);
        } catch (error) {
          console.error("Failed to fetch brightness:", error);
        }
      }
      setIsLoading(false);
    }
    initialize();
  }, []);

  async function handleSubmit(values: BrightnessFormValues) {
    try {
      // Validate input
      const brightnessLevel = parseInt(values.level, 10);

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
        // Store the brightness value for reference
        await LocalStorage.setItem("lastBrightness", brightnessLevel.toString());

        // Show old → new brightness in HUD
        const oldValue = currentBrightness !== null ? `${currentBrightness}%` : "?";
        await showHUD(`☀️ ${oldValue} → ${brightnessLevel}%`);
        
        // Close the form
        pop();
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
                <Action.Open title="Install Lunar" target="https://lunar.fyi/" />
                <Action.Open title="Install via Homebrew" target="x-man-page://brew" />
              </>
            )}
            {lunarStatus.app && !lunarStatus.cli && (
              <Action title="Install Lunar CLI" onAction={handleInstallCLI} />
            )}
          </ActionPanel>
        }
      />
    );
  }

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
      <Form.Description title="Current Brightness" text={currentBrightnessText} />
      <Form.TextField
        id="level"
        title="New Brightness"
        placeholder="1-100"
        info="Enter a value between 1 and 100"
      />
    </Form>
  );
}
