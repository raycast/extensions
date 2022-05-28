import open from "open";
import { closeMainWindow, showHUD } from "@raycast/api";

export default async () => {
  const url = "zenmode://deactivate";
  open(url);
  await closeMainWindow();
  await showHUD("Zen Mode - Deactivated");
};
