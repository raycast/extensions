import { closeMainWindow, showHUD } from "@raycast/api";
import { ClientManager } from "./api/clientManager";
import { setTimeout } from "node:timers/promises";

export default async function Command() {
  closeMainWindow();
  showHUD("Stopping all sounds...");
  const oscClient = ClientManager.initializeOscClient();
  oscClient.stopAll();
  await setTimeout(5); // just to ensure the message is sent before closing the port
  oscClient.close();
}
