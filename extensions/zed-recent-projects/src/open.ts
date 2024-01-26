import { closeMainWindow, getSelectedFinderItems, open, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { saveZedEntries } from "./lib/zedEntries";
import { ZED_BUNDLE_ID } from "./lib/zed";

const getCurrentFinderPathScript = `
try
  tell application "Finder"
    return POSIX path of (insertion location as alias)
  end tell
on error
  return ""
end try
`;

export const getCurrentFinderPath = async () => {
  return await runAppleScript(getCurrentFinderPathScript);
};

export default async function openWithZed() {
  try {
    let selectedItems: { path: string }[] = [];

    const finderItems = await getSelectedFinderItems();
    if (finderItems.length === 0) {
      console.log("Test");
      const currentPath = await getCurrentFinderPath();
      console.log(currentPath);
      if (currentPath) {
        selectedItems = [{ path: currentPath }];
      } else {
        throw new Error("No Finder item selected");
      }
    } else {
      selectedItems = finderItems.map((i) => ({ path: i.path }));
    }

    await saveZedEntries(
      selectedItems.map((item) => ({
        uri: `file://${item.path}`,
        lastOpened: Date.now(),
      }))
    );

    for (const finderItem of selectedItems) {
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
