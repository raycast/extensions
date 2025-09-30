import { showHUD } from "@raycast/api";
import { initializeFarragoOscSender } from "./services/initializers";

export default async function Command() {
  showHUD("Stopped all sounds");

  const oscSender = initializeFarragoOscSender();
  await oscSender.runTransportAction("stopAll");
}
