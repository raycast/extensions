import open from "open";
import { closeMainWindow, showHUD } from "@raycast/api";

export default async () => {
  const url = "zenmode://activate";
  open(url);
  await closeMainWindow();
  await showHUD("Zen Mode - Activated");
};
