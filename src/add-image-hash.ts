import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { createHash } from "crypto";
import { readdirSync, readFileSync, renameSync, statSync } from "fs";
import { extname, join, basename } from "path";

interface Preferences {
  folder: string;
}

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".tiff",
  ".tif",
  ".ico",
  ".avif",
]);

function md5Hash(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("md5").update(content).digest("hex").slice(0, 8);
}

function isImage(filePath: string): boolean {
  return IMAGE_EXTENSIONS.has(extname(filePath).toLowerCase());
}

/** Returns true if filename already looks like name.XXXXXXXX.ext (8-char hex hash) */
function alreadyHashed(filename: string): boolean {
  const ext = extname(filename);
  const stem = basename(filename, ext);
  // stem must contain at least one dot — last segment is the hash
  const parts = stem.split(".");
  if (parts.length < 2) return false;
  const last = parts[parts.length - 1];
  return /^[0-9a-f]{8}$/.test(last);
}

export default async function main() {
  const { folder } = getPreferenceValues<Preferences>();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Processing images…",
    message: folder,
  });

  try {
    const entries = readdirSync(folder);
    const images = entries.filter((f) => {
      const full = join(folder, f);
      return statSync(full).isFile() && isImage(f) && !alreadyHashed(f);
    });

    if (images.length === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: "Nothing to rename",
        message: "All images already have a hash, or the folder is empty.",
      });
      return;
    }

    let renamed = 0;
    const errors: string[] = [];

    for (const filename of images) {
      const full = join(folder, filename);
      const ext = extname(filename);
      const stem = basename(filename, ext);
      try {
        const hash = md5Hash(full);
        const newName = `${stem}.${hash}${ext}`;
        renameSync(full, join(folder, newName));
        renamed++;
      } catch (err) {
        errors.push(
          `${filename}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (errors.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Renamed ${renamed}, ${errors.length} failed`,
        message: errors.slice(0, 3).join("\n"),
      });
    } else {
      toast.hide();
      await showHUD(`✅ Renamed ${renamed} image${renamed === 1 ? "" : "s"}`);
    }
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to read folder",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
