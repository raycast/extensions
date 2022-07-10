import open from "open";
import { closeMainWindow, showHUD } from "@raycast/api";
import { isZenModeInstalled } from "./checkInstall";

export default async () => {
  if (await isZenModeInstalled()) {
    const url = "zenmode://activate";
    open(url);
    await closeMainWindow();
    await showHUD("Zen Mode - Activated");
  } else {
    await showHUD("Zen Mode app is not installed");
  }
};
