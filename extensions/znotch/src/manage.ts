import { closeMainWindow, showHUD, open } from "@raycast/api";
import { isZNotchInstalled } from "./check-installed";

export enum Action {
  Toggle = "toggle",
  Show = "show",
  Hide = "hide",
}

export async function manage(action: Action, message: string) {
  if (await isZNotchInstalled()) {
    open(`xyz.kondor.znotch://v1/manage?action=${action}`);
    showHUD("zNotch: " + message);
    await closeMainWindow();
  } else {
    await showHUD("zNotch App is not installed");
  }
}
