import { showHUD } from "@raycast/api";

export default async function Command() {
  await showHUD("zero extension is ready to use with AI commands");
  return;
}
