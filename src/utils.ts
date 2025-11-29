import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ImageMetadata {
  width: number;
  height: number;
}

export async function getImageMetadata(path: string): Promise<ImageMetadata> {
  try {
    // oiiotool --info -v <path>
    // We can parse the output, or use --info:format=xml for easier parsing if available,
    // but standard output usually has "Spec: <width> x <height>" or similar.
    // A more robust way with oiiotool is using expression evaluation to print just what we need.
    // oiiotool --eval "print(img.width, ' ', img.height)" <path> (syntax might vary)

    // Simpler approach: oiiotool --info <path> and regex for " <width> x <height> "
    // Example output line: "    Spec: 1920 x 1080 x 3 uint8"

    const command = `oiiotool --info "${path}"`;
    const { stdout } = await execAsync(command, {
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:${process.env.PATH}`,
      },
    });

    // Look for pattern like "Spec: 1920 x 1080" or just the first resolution-like string
    // oiiotool output typically starts with the filename, then properties.
    // "    1920 x 1080, 3 channel, uint8"

    const match = stdout.match(/(\d+)\s*x\s*(\d+)/);
    if (match) {
      return {
        width: parseInt(match[1], 10),
        height: parseInt(match[2], 10),
      };
    }

    throw new Error("Could not parse resolution from oiiotool output");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check for common dependency/library issues
    if (
      errorMessage.includes("Library not loaded") ||
      errorMessage.includes("dyld")
    ) {
      throw new Error(
        `OpenImageIO dependency issue detected. Please reinstall OpenImageIO:\n\nbrew reinstall openimageio\n\nOriginal error: ${errorMessage}`,
      );
    }

    throw new Error(`Failed to get metadata for ${path}: ${errorMessage}`);
  }
}

export async function checkOiiotoolInstalled(): Promise<boolean> {
  try {
    await execAsync("oiiotool --help", {
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`,
      },
    });
    return true;
  } catch (error) {
    // Fallback: check if the file exists at common locations
    // This handles cases where PATH might not be propagating correctly in the Raycast environment
    try {
      const fs = await import("fs/promises");
      const commonPaths = [
        "/opt/homebrew/bin/oiiotool",
        "/usr/local/bin/oiiotool",
      ];
      for (const p of commonPaths) {
        try {
          await fs.access(p);
          return true;
        } catch {
          continue;
        }
      }
    } catch {
      // Ignore fs errors
    }
    return false;
  }
}
