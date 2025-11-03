import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { openNewPrivateWindow } from "./actions";

export default async function Command() {
  try {
    await closeMainWindow();
    await openNewPrivateWindow();
  } catch (error) {
    await showToast({
      title: "Failed opening new private window",
      style: Toast.Style.Failure,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
