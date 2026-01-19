import { closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openNewWindow } from "./actions";

export default async function Command() {
  try {
    await closeMainWindow();
    await openNewWindow();
  } catch (error) {
    await showFailureToast(error, { title: "Failed opening new window" });
  }
}
