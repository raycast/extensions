import { closeMainWindow, getSelectedFinderItems, open, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { getZedApp } from "./lib/zed";
import { isMac, isWindows } from "./lib/utils";
import { getCurrentExplorerPath, getSelectedFileExplorerItems } from "./lib/windows";

export const getCurrentFinderPath = async () => {
  const getCurrentFinderPathScript = `
      try
        tell application "Finder"
          return POSIX path of (insertion location as alias)
        end tell
      on error
        return ""
      end try
    `;
  return await runAppleScript(getCurrentFinderPathScript);
};

const fileExplorerApp = isWindows ? "Windows Explorer" : "Finder";

export default async function openWithZed() {
  try {
    let selectedItems: { path: string }[] = [];

    if (isMac) {
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
    }

    if (isWindows) {
      const explorerItems = await getSelectedFileExplorerItems();
      if (explorerItems.length === 0) {
        const currentPath = await getCurrentExplorerPath();
        if (currentPath) {
          selectedItems = [{ path: currentPath }];
        } else {
          throw new Error("No Explorer item selected");
        }
      } else {
        selectedItems = explorerItems.map((path) => ({ path }));
      }
    }

    const app = await getZedApp();
    for (const { path } of selectedItems) {
      // on windows it just opens the first item, it is a raycast issue
      await open(encodeURI(path), app);
    }

    await closeMainWindow();
  } catch (e) {
    await showToast({
      title: `Failed opening selected ${fileExplorerApp} item`,
      style: Toast.Style.Failure,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
