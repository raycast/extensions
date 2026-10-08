import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const ZIPIC_BUNDLE_ID = "studio.5km.zipic";

export interface ZipicPreset {
  id: string;
  name: string;
  isDefault: boolean;
  isFavorite: boolean;
  compressionOption: {
    level: number;
    format: string;
    overwrite: boolean;
    progressive: boolean;
    saving: {
      location: string;
      specified: boolean;
      suffix: { enable: boolean; value: string };
      subfolder: { enable: boolean; value: string };
    };
    resizing: {
      width: number;
      height: number;
      ratio: boolean;
    };
  };
}

export interface ZipicPresetsData {
  presets: ZipicPreset[];
  selectedPresetId: string | null;
}

export async function readZipicPresets(): Promise<ZipicPresetsData> {
  const { stdout } = await execFileAsync("defaults", ["export", ZIPIC_BUNDLE_ID, "-"], {
    maxBuffer: 10 * 1024 * 1024,
  });

  const presetMatch = stdout.match(/<key>PresetData<\/key>\s*<data>([\s\S]*?)<\/data>/);
  const selectedMatch = stdout.match(/<key>SelectedPresetId<\/key>\s*<string>([^<]+)<\/string>/);

  if (!presetMatch) {
    return { presets: [], selectedPresetId: null };
  }

  const base64 = presetMatch[1].replace(/\s+/g, "");
  const json = Buffer.from(base64, "base64").toString("utf-8");
  const presets = JSON.parse(json) as ZipicPreset[];

  return {
    presets,
    selectedPresetId: selectedMatch ? selectedMatch[1] : null,
  };
}

export function buildCompressURL(filePaths: string[], preset: ZipicPreset): string {
  const params = new URLSearchParams();

  for (const path of filePaths) {
    params.append("url", path);
  }

  const opt = preset.compressionOption;

  params.append("level", String(opt.level));
  params.append("format", opt.format);
  params.append("overwrite", String(opt.overwrite));
  params.append("progressive", String(opt.progressive));

  params.append("location", opt.saving.location);
  params.append("specified", String(opt.saving.specified));

  params.append("addSuffix", String(opt.saving.suffix.enable));
  if (opt.saving.suffix.value) {
    params.append("suffix", opt.saving.suffix.value);
  }

  params.append("addSubfolder", String(opt.saving.subfolder.enable));
  if (opt.saving.subfolder.value) {
    params.append("subfolder", opt.saving.subfolder.value);
  }

  params.append("ratio", String(opt.resizing.ratio));
  if (opt.resizing.width > 0) {
    params.append("width", String(opt.resizing.width));
  }
  if (opt.resizing.height > 0) {
    params.append("height", String(opt.resizing.height));
  }

  // Zipic parses query items via Swift's URLComponents which does not
  // decode `+` back to space. URLSearchParams encodes spaces as `+`, so
  // swap them to `%20` before handing the URL to Zipic.
  return `zipic://compress?${params.toString().replace(/\+/g, "%20")}`;
}

export function describePreset(preset: ZipicPreset): string {
  const o = preset.compressionOption;
  const parts: string[] = [`Level ${o.level}`];

  if (o.format && o.format !== "original") {
    parts.push(o.format.toUpperCase());
  }

  if (o.resizing.width > 0 || o.resizing.height > 0) {
    const w = o.resizing.width > 0 ? `${o.resizing.width}` : "auto";
    const h = o.resizing.height > 0 ? `${o.resizing.height}` : "auto";
    parts.push(`${w}×${h}`);
  }

  if (o.saving.location !== "original") {
    parts.push(`save: ${o.saving.location}`);
  }

  if (o.saving.suffix.enable) {
    parts.push(`suffix: ${o.saving.suffix.value}`);
  }

  if (o.saving.subfolder.enable) {
    parts.push(`subfolder: ${o.saving.subfolder.value}`);
  }

  return parts.join(" · ");
}
