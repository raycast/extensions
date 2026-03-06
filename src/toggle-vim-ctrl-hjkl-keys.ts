import { showHUD, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

interface Manipulator {
  type: string;
  from: Record<string, unknown>;
  to?: Record<string, unknown>[];
}

interface Rule {
  description: string;
  enabled?: boolean;
  manipulators: Manipulator[];
}

interface ComplexModifications {
  rules: Rule[];
  parameters?: Record<string, unknown>;
}

interface Profile {
  name: string;
  complex_modifications?: ComplexModifications;
  [key: string]: unknown;
}

interface KarabinerConfig {
  profiles: Profile[];
  [key: string]: unknown;
}

const CONFIG_PATH = join(homedir(), ".config/karabiner/karabiner.json");

export default async function Command() {
  const { ruleTitle } = getPreferenceValues<Preferences>();

  try {
    const data = await readFile(CONFIG_PATH, "utf8");
    const config: KarabinerConfig = JSON.parse(data);

    const matchedProfiles: string[] = [];
    let wasEnabled = false;
    let firstMatch = true;

    for (const profile of config.profiles) {
      if (!profile.complex_modifications?.rules) continue;

      for (const rule of profile.complex_modifications.rules) {
        if (rule.description === ruleTitle) {
          if (firstMatch) {
            wasEnabled = rule.enabled !== false; // undefined or true = enabled
            firstMatch = false;
          }
          break;
        }
      }
      if (!firstMatch) break;
    }

    if (firstMatch) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Rule Not Found",
        message: `"${ruleTitle}" not found in any profile`,
      });
      return;
    }

    const newState = !wasEnabled;
    for (const profile of config.profiles) {
      if (!profile.complex_modifications?.rules) continue;

      for (const rule of profile.complex_modifications.rules) {
        if (rule.description === ruleTitle) {
          rule.enabled = newState;
          matchedProfiles.push(profile.name);
        }
      }
    }

    await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");

    const stateLabel = newState ? "Enabled" : "Disabled";
    const stateIcon = newState ? "▶️" : "⏸";
    const profileInfo = matchedProfiles.length > 1 ? ` (${matchedProfiles.length} profiles)` : "";

    await showHUD(`${stateIcon} ${ruleTitle}: ${stateLabel}${profileInfo}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
