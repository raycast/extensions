import { LocalStorage } from "@raycast/api";

export async function clearThresholds() {
  await LocalStorage.setItem("lowThreshold", "");
  await LocalStorage.setItem("highThreshold", "");
}
