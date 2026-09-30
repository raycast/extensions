import { closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openNewPrivateWindow } from "./actions";

export default async function Command() {
  try {
    await closeMainWindow();
    await openNewPrivateWindow();
  } catch (error) {
    await showFailureToast(error, { title: "Failed opening new private window" });
  }
}
