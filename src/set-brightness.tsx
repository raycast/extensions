import { showToast, Toast, showHUD, LocalStorage, Form, ActionPanel, Action, useNavigation, Detail } from "@raycast/api";
import * as React from "react";
import { useEffect, useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { existsSync } from "fs";

const execAsync = promisify(exec);

// Helper function to retry operations with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 500,
  validator?: (result: T) => boolean
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await operation();
      
      // If validator is provided, check if result is valid
      if (validator && !validator(result)) {
        throw new Error("Validation failed");
      }
      
      return result;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt + 1}/${maxRetries} failed:`, error);
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

interface BrightnessFormValues {
  level: string;
  display: string;
}

interface DisplayInfo {
  id: string;
  name: string;
  serial: string;
  brightness: number;
  main: boolean;
  active: boolean;
  adaptive: boolean;
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

// Get all displays with their properties
async function getDisplays(): Promise<DisplayInfo[]> {
  return retryWithBackoff(
    async () => {
      const lunarPath = `${homedir()}/.local/bin/lunar`;
      const { stdout } = await execAsync(`"${lunarPath}" displays --json`, { timeout: 5000 });
      
      if (!stdout || stdout.trim() === "") {
        throw new Error("Empty response from Lunar displays command");
      }
      
      // Extract JSON from output (it might have other text before/after)
      let jsonStr = stdout.trim();
      const jsonStart = jsonStr.indexOf('{');
      
      if (jsonStart === -1) {
        throw new Error("No JSON found in Lunar output");
      }
      
      // Find the matching closing brace by counting braces
      let braceCount = 0;
      let jsonEnd = -1;
      for (let i = jsonStart; i < jsonStr.length; i++) {
        if (jsonStr[i] === '{') braceCount++;
        if (jsonStr[i] === '}') braceCount--;
        if (braceCount === 0) {
          jsonEnd = i;
          break;
        }
      }
      
      if (jsonEnd === -1) {
        throw new Error("Could not find end of JSON in Lunar output");
      }
      
      jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
      const displaysData = JSON.parse(jsonStr);
      
      const displays: DisplayInfo[] = [];
      for (const [serial, data] of Object.entries(displaysData)) {
        const displayData = data as any;
        if (displayData.active) {
          displays.push({
            id: displayData.id.toString(),
            name: displayData.name,
            serial: serial,
            brightness: displayData.brightness,
            main: displayData.main,
            active: displayData.active,
            adaptive: displayData.adaptive || false,
          });
        }
      }
      
      // Sort displays: main display first
      displays.sort((a, b) => {
        if (a.main && !b.main) return -1;
        if (!a.main && b.main) return 1;
        return 0;
      });
      
      return displays;
    },
    3,
    500,
    (displays) => displays.length > 0 // Validate that we got at least one display
  );
}

// Get the display where the cursor is currently located
async function getCursorDisplay(): Promise<string | null> {
  try {
    return await retryWithBackoff(
      async () => {
        const lunarPath = `${homedir()}/.local/bin/lunar`;
        const { stdout } = await execAsync(`"${lunarPath}" displays cursor serial`, { timeout: 3000 });
        
        if (!stdout || stdout.trim() === "") {
          throw new Error("Empty response from Lunar cursor command");
        }
        
        // Output format: "Serial: <serial>" or just the serial
        const serialMatch = stdout.match(/[Ss]erial:\s*(.+)/);
        if (serialMatch) {
          return serialMatch[1].trim();
        }
        
        // Try to extract UUID format directly (format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX)
        const uuidMatch = stdout.match(/([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})/i);
        if (uuidMatch) {
          return uuidMatch[1];
        }
        
        throw new Error("Could not parse serial from output");
      },
      3,
      300,
      (serial) => serial !== null && serial.length > 0 // Validate we got a serial
    );
  } catch (error) {
    console.error("Failed to get cursor display after retries:", error);
    return null;
  }
}

// Get brightness for a specific display
async function getBrightnessForDisplay(displaySerial: string): Promise<number | null> {
  try {
    return await retryWithBackoff(
      async () => {
        const lunarPath = `${homedir()}/.local/bin/lunar`;
        const { stdout } = await execAsync(`"${lunarPath}" displays "${displaySerial}" brightness`, { timeout: 3000 });
        const match = stdout.match(/brightness:\s*(\d+)/i);
        
        if (!match) {
          throw new Error("Could not parse brightness from output");
        }
        
        return parseInt(match[1], 10);
      },
      3,
      300,
      (brightness) => brightness !== null && brightness >= 0 && brightness <= 100 // Validate brightness is in range
    );
  } catch (error) {
    console.error(`Failed to get brightness for display ${displaySerial} after retries:`, error);
    return null;
  }
}

// Set adaptive mode for a specific display
async function setAdaptiveMode(displaySerial: string, enabled: boolean): Promise<void> {
  await retryWithBackoff(
    async () => {
      const lunarPath = `${homedir()}/.local/bin/lunar`;
      const mode = enabled ? "on" : "off";
      
      console.log(`Setting adaptive mode for ${displaySerial} to ${mode}`);
      await execAsync(`"${lunarPath}" displays "${displaySerial}" adaptive ${mode}`, { timeout: 3000 });
      
      // Wait a bit for the change to take effect
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return;
    },
    3,
    300
  );
}

// Set brightness for a specific display with verification
async function setBrightnessForDisplay(displaySerial: string, level: number, adaptive: boolean): Promise<void> {
  // If adaptive mode is enabled, disable it first to unlink the display
  if (adaptive) {
    console.log(`Display ${displaySerial} has adaptive mode enabled, disabling it first...`);
    try {
      await setAdaptiveMode(displaySerial, false);
      console.log(`Adaptive mode disabled for ${displaySerial}`);
    } catch (error) {
      console.error(`Failed to disable adaptive mode for ${displaySerial}:`, error);
      // Continue anyway - the brightness command might still work
    }
  }
  
  await retryWithBackoff(
    async () => {
      const lunarPath = `${homedir()}/.local/bin/lunar`;
      
      // Set the brightness
      console.log(`Setting brightness for ${displaySerial} to ${level}%`);
      await execAsync(`"${lunarPath}" displays "${displaySerial}" brightness ${level}`, { timeout: 5000 });
      
      // Wait a bit for the change to take effect
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verify the change by reading back the brightness
      const actualBrightness = await getBrightnessForDisplay(displaySerial);
      
      if (actualBrightness === null) {
        throw new Error("Could not verify brightness change");
      }
      
      // Allow a small tolerance (±2%) for verification
      const tolerance = 2;
      if (Math.abs(actualBrightness - level) > tolerance) {
        throw new Error(`Brightness mismatch: expected ${level}%, got ${actualBrightness}%`);
      }
      
      console.log(`Verified brightness for ${displaySerial} is now ${actualBrightness}%`);
      return;
    },
    5, // More retries for setting
    500
  );
}

export default function Command() {
  const [currentBrightness, setCurrentBrightness] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lunarStatus, setLunarStatus] = useState<{ app: boolean; cli: boolean } | null>(null);
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
          const cursorDisplayExists = cursorDisplaySerial && allDisplays.some(d => d.serial === cursorDisplaySerial);
          
          if (cursorDisplayExists) {
            // Set the cursor display as selected
            console.log(`Detected cursor on display: ${allDisplays.find(d => d.serial === cursorDisplaySerial)?.name}`);
            setSelectedDisplay(cursorDisplaySerial!);
            
            // Get brightness for the cursor display (with built-in retry logic)
            const brightness = await getBrightnessForDisplay(cursorDisplaySerial!);
            setCurrentBrightness(brightness);
          } else {
            // Fallback to main display or first display
            const mainDisplay = allDisplays.find(d => d.main) || allDisplays[0];
            console.log(`Cursor detection failed or not in list, falling back to ${mainDisplay.name}`);
            setSelectedDisplay(mainDisplay.serial);
            setCurrentBrightness(mainDisplay.brightness);
          }
        } catch (error) {
          console.error("Failed to initialize displays:", error);
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to Load Displays",
            message: error instanceof Error ? error.message : "Please try reopening the command",
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
      const display = displays.find(d => d.serial === newDisplaySerial);
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
        await setBrightnessForDisplay(selectedDisplay, brightnessLevel, displayInfo?.adaptive || false);
        
        // Store the brightness value for reference
        await LocalStorage.setItem("lastBrightness", brightnessLevel.toString());

        // Show old → new brightness in HUD with display name
        const oldValue = currentBrightness !== null ? `${currentBrightness}%` : "?";
        await showHUD(`☀️ ${displayName}: ${oldValue} → ${brightnessLevel}%`);
        
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

  const selectedDisplayInfo = displays.find((d) => d.serial === selectedDisplay);
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
      <Form.Description title="Current Brightness" text={currentBrightnessText} />
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
