import { getSelectedFinderItems, open } from "@raycast/api";
import fs from "fs";
import { homedir } from "os";
import { checkZipicInstallation } from "../utils/checkInstall";
import { buildCompressURL, readZipicPresets } from "../utils/zipicPresets";

type Input = {
  /**
   * The preset to use. Either the preset's name (case-insensitive, e.g. "Wechat")
   * or its UUID. If omitted, the user's currently selected default preset is used.
   */
  preset?: string;

  /**
   * Optional list of image paths to compress. If omitted, the currently selected
   * files in Finder are used. Tilde (~) is expanded.
   */
  imagePaths?: string[];
};

/**
 * Compress images using a preset that the user has configured in the Zipic app.
 * Presets are read from Zipic's settings — they cannot be created or edited from
 * Raycast. Use `list-presets` first if the user did not name a specific preset.
 */
export default async function tool({ preset, imagePaths = [] }: Input) {
  const installed = await checkZipicInstallation();
  if (!installed) {
    return { success: false, error: "Zipic is not installed" };
  }

  const { presets, selectedPresetId } = await readZipicPresets();
  if (presets.length === 0) {
    return {
      success: false,
      error: "No presets found. Open Zipic to create one.",
    };
  }

  const target = resolvePreset(presets, preset, selectedPresetId);
  if (!target) {
    return {
      success: false,
      error: `Preset "${preset}" not found. Available: ${presets.map((p) => p.name).join(", ")}`,
    };
  }

  let filePaths: string[];
  if (imagePaths.length > 0) {
    filePaths = imagePaths
      .map((p) => (p.startsWith("~") ? p.replace(/^~/, homedir()) : p))
      .filter((p) => {
        try {
          fs.statSync(p);
          return true;
        } catch {
          return false;
        }
      });
  } else {
    const items = await getSelectedFinderItems();
    filePaths = items.map((i) => i.path);
  }

  if (filePaths.length === 0) {
    return {
      success: true,
      message: "No images selected. Please select images in Finder or provide image paths.",
      imagePaths: [],
    };
  }

  const url = buildCompressURL(filePaths, target);
  try {
    await open(url);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to open Zipic",
    };
  }

  return {
    success: true,
    message: `Started compressing ${filePaths.length} item(s) with preset "${target.name}"`,
    presetId: target.id,
    presetName: target.name,
    imagePaths: filePaths,
  };
}

function resolvePreset<T extends { id: string; name: string }>(
  presets: T[],
  query: string | undefined,
  fallbackId: string | null,
): T | undefined {
  if (!query) {
    return presets.find((p) => p.id === fallbackId) ?? presets[0];
  }
  const q = query.trim().toLowerCase();
  return (
    presets.find((p) => p.id.toLowerCase() === q) ??
    presets.find((p) => p.name.toLowerCase() === q) ??
    presets.find((p) => p.name.toLowerCase().includes(q))
  );
}
