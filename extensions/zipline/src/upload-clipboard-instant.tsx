import { Clipboard, closeMainWindow, showHUD, LaunchProps } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";
import { createZiplineClient } from "./utils/preferences";

interface UploadClipboardInstantArguments {
  fileType?: string;
}

export default async function UploadClipboardInstant(
  props: LaunchProps<{ arguments: UploadClipboardInstantArguments }>,
) {
  try {
    const { fileType } = props.arguments;

    // Get clipboard text
    const clipboardText = await Clipboard.readText();

    if (!clipboardText || clipboardText.trim().length === 0) {
      await showHUD("❌ No text found in clipboard");
      return;
    }

    await showHUD("⏳ Uploading clipboard text...");

    // Close Raycast window immediately to feel instant
    await closeMainWindow();

    const ziplineClient = createZiplineClient();

    // Create a temporary file - the server seems to need an actual file

    const tempDir = os.tmpdir();
    const extension = fileType || "txt";
    const filename = `clipboard-${Date.now()}.${extension}`;
    const tempFilePath = path.join(tempDir, filename);

    // Write text to temporary file
    fs.writeFileSync(tempFilePath, clipboardText, "utf8");

    const uploadResponse = await ziplineClient.uploadFile(
      tempFilePath,
      filename,
      {
        format: "RANDOM",
        fileExtension: extension,
      },
    );

    // Clean up temporary file
    try {
      fs.unlinkSync(tempFilePath);
    } catch {
      // Ignore cleanup errors
    }

    if (
      Array.isArray(uploadResponse.files) &&
      uploadResponse.files.length > 0
    ) {
      const uploadUrl = uploadResponse.files[0].url;

      // Copy URL to clipboard
      await Clipboard.copy(uploadUrl);

      await showHUD("✅ Text uploaded! URL copied to clipboard");
    } else {
      await showHUD(`❌ Upload failed - no files returned`);
    }
  } catch (error) {
    await showHUD(
      `❌ Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
