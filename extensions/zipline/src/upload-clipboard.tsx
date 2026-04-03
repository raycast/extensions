import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { uploadFiles, handleApiError } from "./api";

function normalizeFilePath(raw: string): string {
  let cleaned = raw;
  if (cleaned.startsWith("file://")) {
    cleaned = cleaned.slice(7);
  }
  cleaned = decodeURIComponent(cleaned);
  return cleaned;
}

export default async function UploadClipboardCommand() {
  try {
    const { file, text } = await Clipboard.read();

    if (file) {
      const filePath = normalizeFilePath(file);
      let fileName = path.basename(filePath);

      if (!path.extname(fileName)) {
        const mime = fs.readFileSync(filePath).slice(0, 8);
        let ext = "png";
        if (mime[0] === 0xff && mime[1] === 0xd8) ext = "jpg";
        else if (mime[0] === 0x89 && mime[1] === 0x50) ext = "png";
        else if (mime[0] === 0x47 && mime[1] === 0x49) ext = "gif";
        else if (mime[0] === 0x52 && mime[1] === 0x49) ext = "webp";
        fileName = `${fileName}.${ext}`;
      }

      const result = await uploadFiles([{ path: filePath, name: fileName }]);
      const urls = result.files.map((f) => f.url).join("\n");
      await Clipboard.copy(urls);
      await showHUD(`✅ Uploaded: ${urls}`);
      return;
    }

    if (text) {
      const match = text.trim().match(/^data:image\/(\w+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === "jpeg" ? "jpg" : match[1];
        const base64 = match[2];
        const buffer = Buffer.from(base64, "base64");
        const tmpPath = path.join(
          os.tmpdir(),
          `zipline-clipboard-${Date.now()}.${ext}`,
        );
        fs.writeFileSync(tmpPath, new Uint8Array(buffer));

        const result = await uploadFiles([
          { path: tmpPath, name: `clipboard-image.${ext}` },
        ]);
        fs.unlinkSync(tmpPath);

        const urls = result.files.map((f) => f.url).join("\n");
        await Clipboard.copy(urls);
        await showHUD(`✅ Uploaded: ${urls}`);
        return;
      }
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "No image in clipboard",
      message: "Copy an image or screenshot first",
    });
  } catch (error) {
    await handleApiError(error, "Upload");
  }
}
