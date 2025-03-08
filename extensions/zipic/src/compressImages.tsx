import { showToast, Toast, getSelectedFinderItems } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";
import { checkZipicInstallation } from "./utils/checkInstall";

export default async function main() {
  const isInstalled = await checkZipicInstallation();
  if (!isInstalled) {
    return;
  }

  let filePaths: string[];

  try {
    // Get selected files
    filePaths = (await getSelectedFinderItems()).map((f) => f.path);
    if (filePaths.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Warning! No Finder items selected",
      });
      return;
    }

    let urlParams = "";

    filePaths.forEach((path) => {
      urlParams += `url=${encodeURIComponent(path)}&`;
    });

    if (urlParams.endsWith("&")) {
      urlParams = urlParams.slice(0, -1);
    }

    const url = `zipic://compress?${urlParams}`;

    await showToast({
      style: Toast.Style.Success,
      title: "Compressing with Zipic",
      message: "Using Zipic app settings",
    });

    exec(`open "${url}"`);
  } catch (e) {
    await showFailureToast(e instanceof Error ? e.message : "Could not get the selected Finder items");
  }
}
