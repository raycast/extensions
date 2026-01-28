import open from "open";
import { closeMainWindow, showHUD } from "@raycast/api";
import { isZenModeInstalled } from "./checkInstall";

export default async () => {
  if (await isZenModeInstalled()) {
    const url = "zenmode://createmode";
    open(url);
    await closeMainWindow();
    await showHUD("Zen Mode app opened");
  } else {
    await showHUD("Zen Mode app is not installed");
  }
};
