import {
  Clipboard,
  showHUD,
  showToast,
  Toast,
  getSelectedFinderItems,
} from "@raycast/api";
import { uploadFiles, handleApiError } from "./api";

export default async function UploadSelectedCommand() {
  try {
    const items = await getSelectedFinderItems();
    if (items.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
        message: "Select files in Finder first",
      });
      return;
    }

    const files = items.map((item) => {
      const path = item.path;
      const parts = path.split("/");
      const name = parts[parts.length - 1];
      return { path, name };
    });

    const result = await uploadFiles(files);
    const urls = result.files.map((f) => f.url).join("\n");
    await Clipboard.copy(urls);
    await showHUD(`✅ Uploaded ${result.files.length} file(s)!`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("ScriptingBridge")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot access Finder",
        message:
          "Please grant Raycast access to Finder in System Settings > Privacy & Security",
      });
      return;
    }
    await handleApiError(error, "Upload");
  }
}
