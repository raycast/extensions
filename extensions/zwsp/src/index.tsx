import { Clipboard, showHUD, closeMainWindow } from "@raycast/api";

export default async function ZWSP() {
  await Clipboard.copy("​"); // trust me, it's there
  closeMainWindow({ clearRootSearch: true });
  showHUD("Copied successfully");

  return null;
}
