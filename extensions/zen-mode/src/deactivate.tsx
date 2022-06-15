import open from "open";
import { closeMainWindow, showHUD } from "@raycast/api";
import { isZenModeInstalled } from "./checkInstall";

export default async () => {
  if (await isZenModeInstalled()) {
    const url = "zenmode://deactivate";
    open(url);
    await closeMainWindow();
    await showHUD("Zen Mode - Deactivated");
  } else {
    await showHUD("Zen Mode app is not installed");
  }
};
