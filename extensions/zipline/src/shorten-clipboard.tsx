import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { shortenUrl, handleApiError } from "./api";

function isValidUrl(text: string): boolean {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

export default async function ShortenClipboardCommand() {
  try {
    const clipboardText = await Clipboard.readText();
    if (!clipboardText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard is empty",
        message: "Copy a URL first",
      });
      return;
    }

    const url = clipboardText.trim();
    if (!isValidUrl(url)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard does not contain a valid URL",
        message: clipboardText.substring(0, 50),
      });
      return;
    }

    const result = await shortenUrl(url);
    await Clipboard.copy(result.url);
    await showHUD(`✅ Shortened: ${result.url}`);
  } catch (error) {
    await handleApiError(error, "Shorten URL");
  }
}
