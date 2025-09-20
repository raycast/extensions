import { closeMainWindow, getSelectedFinderItems, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { getZedBundleId, ZedBuild } from "./lib/zed";

const preferences: Record<string, string> = getPreferenceValues();
const zedBuild: ZedBuild = preferences.build as ZedBuild;

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
      const currentPath = await getCurrentFinderPath();
      if (currentPath) {
        selectedItems = [{ path: currentPath }];
      } else {
        throw new Error("No Finder item selected");
      }
    } else {
      selectedItems = finderItems.map((i) => ({ path: i.path }));
    }

    for (const finderItem of selectedItems) {
      await open(finderItem.path, getZedBundleId(zedBuild));
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
