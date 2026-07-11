import open from "open";
import { closeMainWindow, showHUD } from "@raycast/api";
import { isZenModeInstalled } from "./checkInstall";

export default async () => {
  if (await isZenModeInstalled()) {
    const url = "zenmode://stop";
    open(url);
    await closeMainWindow();
  } else {
    await showHUD("Zen Mode app is not installed");
  }
};
