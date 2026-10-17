import { checkZipicInstallation } from "../utils/checkInstall";
import { describePreset, readZipicPresets } from "../utils/zipicPresets";

/**
 * List the user's compression presets configured in the Zipic app.
 * Use this when the user asks what presets they have, or before
 * `compress-with-preset` if you don't know which preset to apply.
 */
export default async function tool() {
  const installed = await checkZipicInstallation();
  if (!installed) {
    return { success: false, error: "Zipic is not installed" };
  }

  const { presets, selectedPresetId } = await readZipicPresets();

  return {
    success: true,
    count: presets.length,
    selectedPresetId,
    presets: presets.map((p) => ({
      id: p.id,
      name: p.name,
      isDefault: p.isDefault,
      isFavorite: p.isFavorite,
      summary: describePreset(p),
      level: p.compressionOption.level,
      format: p.compressionOption.format,
    })),
  };
}
