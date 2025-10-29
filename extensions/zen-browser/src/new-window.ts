import { closeMainWindow } from "@raycast/api";
import { openNewWindow } from "./actions";

export default async function Command() {
  await closeMainWindow();
  await openNewWindow();
}
