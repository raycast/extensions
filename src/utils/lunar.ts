import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { existsSync } from "fs";

const execAsync = promisify(exec);

// Helper function to retry operations with exponential backoff
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 500,
  validator?: (result: T) => boolean,
): Promise<T> {
  let lastError: unknown;

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
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export interface DisplayInfo {
  id: string;
  name: string;
  serial: string;
  brightness: number;
  main: boolean;
  active: boolean;
  adaptive: boolean;
}

export interface LunarDisplayData {
  id: number | string;
  name: string;
  brightness: number;
  main: boolean;
  active: boolean;
  adaptive?: boolean;
}

// Get Lunar CLI path
export function getLunarPath(): string {
  return `${homedir()}/.local/bin/lunar`;
}

// Get current brightness using Lunar CLI
export async function getBrightnessWithLunar(): Promise<number | null> {
  try {
    const lunarPath = getLunarPath();
    const { stdout } = await execAsync(`"${lunarPath}" get brightness`);
    const match = stdout.match(/brightness:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  } catch (error) {
    return null;
  }
}

// Check if Lunar is installed
export function isLunarInstalled(): { app: boolean; cli: boolean } {
  const appInstalled = existsSync("/Applications/Lunar.app");
  const cliInstalled = existsSync(getLunarPath());
  return { app: appInstalled, cli: cliInstalled };
}

// Install Lunar CLI
export async function installLunarCLI(): Promise<boolean> {
  try {
    await execAsync("/Applications/Lunar.app/Contents/MacOS/Lunar install-cli");
    return true;
  } catch (error) {
    return false;
  }
}

// Get all displays with their properties
export async function getDisplays(): Promise<DisplayInfo[]> {
  return retryWithBackoff(
    async () => {
      const lunarPath = getLunarPath();
      const { stdout } = await execAsync(`"${lunarPath}" displays --json`, {
        timeout: 5000,
      });

      if (!stdout || stdout.trim() === "") {
        throw new Error("Empty response from Lunar displays command");
      }

      // Extract JSON from output (it might have other text before/after)
      let jsonStr = stdout.trim();
      const jsonStart = jsonStr.indexOf("{");

      if (jsonStart === -1) {
        throw new Error("No JSON found in Lunar output");
      }

      // Find the matching closing brace by counting braces
      let braceCount = 0;
      let jsonEnd = -1;
      for (let i = jsonStart; i < jsonStr.length; i++) {
        if (jsonStr[i] === "{") braceCount++;
        if (jsonStr[i] === "}") braceCount--;
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
        const displayData = data as LunarDisplayData;
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
    (displays) => displays.length > 0, // Validate that we got at least one display
  );
}

// Get the display where the cursor is currently located
export async function getCursorDisplay(): Promise<string | null> {
  try {
    return await retryWithBackoff(
      async () => {
        const lunarPath = getLunarPath();
        const { stdout } = await execAsync(
          `"${lunarPath}" displays cursor serial`,
          { timeout: 3000 },
        );

        if (!stdout || stdout.trim() === "") {
          throw new Error("Empty response from Lunar cursor command");
        }

        // Output format: "Serial: <serial>" or just the serial
        const serialMatch = stdout.match(/[Ss]erial:\s*(.+)/);
        if (serialMatch) {
          return serialMatch[1].trim();
        }

        // Try to extract UUID format directly (format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX)
        const uuidMatch = stdout.match(
          /([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})/i,
        );
        if (uuidMatch) {
          return uuidMatch[1];
        }

        throw new Error("Could not parse serial from output");
      },
      3,
      300,
      (serial) => serial !== null && serial.length > 0, // Validate we got a serial
    );
  } catch (error) {
    console.error("Failed to get cursor display after retries:", error);
    return null;
  }
}

// Get brightness for a specific display
export async function getBrightnessForDisplay(
  displaySerial: string,
): Promise<number | null> {
  try {
    return await retryWithBackoff(
      async () => {
        const lunarPath = getLunarPath();
        const { stdout } = await execAsync(
          `"${lunarPath}" displays "${displaySerial}" brightness`,
          { timeout: 3000 },
        );
        const match = stdout.match(/brightness:\s*(\d+)/i);

        if (!match) {
          throw new Error("Could not parse brightness from output");
        }

        return parseInt(match[1], 10);
      },
      3,
      300,
      (brightness) =>
        brightness !== null && brightness >= 0 && brightness <= 100, // Validate brightness is in range
    );
  } catch (error) {
    console.error(
      `Failed to get brightness for display ${displaySerial} after retries:`,
      error,
    );
    return null;
  }
}

// Set adaptive mode for a specific display
export async function setAdaptiveMode(
  displaySerial: string,
  enabled: boolean,
): Promise<void> {
  await retryWithBackoff(
    async () => {
      const lunarPath = getLunarPath();
      const mode = enabled ? "on" : "off";

      console.log(`Setting adaptive mode for ${displaySerial} to ${mode}`);
      await execAsync(
        `"${lunarPath}" displays "${displaySerial}" adaptive ${mode}`,
        { timeout: 3000 },
      );

      // Wait a bit for the change to take effect
      await new Promise((resolve) => setTimeout(resolve, 200));

      return;
    },
    3,
    300,
  );
}

// Set brightness for a specific display with verification
export async function setBrightnessForDisplay(
  displaySerial: string,
  level: number,
  adaptive: boolean,
): Promise<void> {
  // If adaptive mode is enabled, disable it first to unlink the display
  if (adaptive) {
    console.log(
      `Display ${displaySerial} has adaptive mode enabled, disabling it first...`,
    );
    try {
      await setAdaptiveMode(displaySerial, false);
      console.log(`Adaptive mode disabled for ${displaySerial}`);
    } catch (error) {
      console.error(
        `Failed to disable adaptive mode for ${displaySerial}:`,
        error,
      );
      // Continue anyway - the brightness command might still work
    }
  }

  await retryWithBackoff(
    async () => {
      const lunarPath = getLunarPath();

      // Set the brightness
      console.log(`Setting brightness for ${displaySerial} to ${level}%`);
      await execAsync(
        `"${lunarPath}" displays "${displaySerial}" brightness ${level}`,
        { timeout: 5000 },
      );

      // Wait a bit for the change to take effect
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify the change by reading back the brightness
      const actualBrightness = await getBrightnessForDisplay(displaySerial);

      if (actualBrightness === null) {
        throw new Error("Could not verify brightness change");
      }

      // Allow a small tolerance (±2%) for verification
      const tolerance = 2;
      if (Math.abs(actualBrightness - level) > tolerance) {
        throw new Error(
          `Brightness mismatch: expected ${level}%, got ${actualBrightness}%`,
        );
      }

      console.log(
        `Verified brightness for ${displaySerial} is now ${actualBrightness}%`,
      );
      return;
    },
    5, // More retries for setting
    500,
  );
}
