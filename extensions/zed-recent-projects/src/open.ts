import { closeMainWindow, getSelectedFinderItems, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { runAppleScript, runPowerShellScript } from "@raycast/utils";
import { getZedBundleId, ZedBuild } from "./lib/zed";
import { isWindows } from "./lib/utils";

const preferences: Record<string, string> = getPreferenceValues();
const zedBuild: ZedBuild = preferences.build as ZedBuild;

export const getCurrentFinderPath = async () => {
  if (isWindows) {
    // Get selected path in Windows Expl
    const script = `
      Add-Type -AssemblyName Microsoft.VisualBasic
      Add-Type -AssemblyName System.Windows.Forms
      $explorer = New-Object -ComObject Shell.Application
      $window = $explorer.Windows() | Where-Object { $_.Document.Folder.Self.Path } | Select-Object -First 1
      if ($window) {
        $window.Document.Folder.Self.Path
      } else {
        ""
      }
    `;
    return await runPowerShellScript(script);
  } else {
    // macOS Finder path
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
  }
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
