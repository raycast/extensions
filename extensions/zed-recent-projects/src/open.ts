import { closeMainWindow, getSelectedFinderItems, open, showToast, Toast } from "@raycast/api";
import { saveZedEntries } from "./lib/zedEntries";
import { ZED_BUNDLE_ID } from "./lib/zed";

export default async function openWithZed() {
  try {
    const finderItems = await getSelectedFinderItems();
    if (finderItems.length === 0) {
      throw new Error("No Finder item selected");
    }

    await saveZedEntries(
      finderItems.map((finderItem) => ({
        uri: `file://${finderItem.path.endsWith("/") ? finderItem.path.slice(0, -1) : finderItem.path}`,
        lastOpened: Date.now(),
      }))
    );

    for (const finderItem of finderItems) {
      await open(finderItem.path, ZED_BUNDLE_ID);
    }

    await closeMainWindow();
  } catch (e) {
    await showToast({
      title: "Failed opening selected Finder item",
      style: Toast.Style.Failure,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
