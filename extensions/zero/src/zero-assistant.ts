import { showHUD } from "@raycast/api";

export default async function Command() {
  try {
    await showHUD("zero extension is ready to use with AI commands");
    return;
  } catch (error) {
    console.error(error);
  }
}
