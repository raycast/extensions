import { getSelectedFinderItems, open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { checkZipicInstallation } from "./utils/checkInstall";

export default async function main() {
  const isInstalled = await checkZipicInstallation();
  if (!isInstalled) {
    return;
  }

  try {
    const filePaths = (await getSelectedFinderItems()).map((f) => f.path);
    if (filePaths.length === 0) {
      await showHUD("⚠️ No Finder items selected");
      return;
    }

    const params = new URLSearchParams();
    for (const path of filePaths) {
      params.append("url", path);
    }
    // Zipic parses query items via Swift's URLComponents which does not
    // decode `+` back to space. URLSearchParams encodes spaces as `+`, so
    // swap them to `%20` before handing the URL to Zipic.
    await open(`zipic://compress?${params.toString().replace(/\+/g, "%20")}`);

    await showHUD(`Compressing ${filePaths.length} item(s) with Zipic`);
  } catch (e) {
    await showFailureToast(e, { title: "Failed to compress with Zipic" });
  }
}
