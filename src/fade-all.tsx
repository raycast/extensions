import { showHUD } from "@raycast/api";
import { initializeFarragoOscSender } from "./services/initializers";

export default async function Command() {
  showHUD("Fading all sounds...");

  const oscSender = initializeFarragoOscSender();
  await oscSender.runMasterAction("fadeAll");
}
