import { showHUD } from "@raycast/api";
import { initializeFarragoOscSender } from "./services/initializers";
import { withFarragoRunningNoView } from "./contexts/appInfoContext";

export default withFarragoRunningNoView(async () => {
  showHUD("Fading all sounds...");

  const oscSender = initializeFarragoOscSender();
  await oscSender.runMasterAction("fadeAll");
});
