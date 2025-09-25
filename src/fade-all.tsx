import { closeMainWindow, showToast } from "@raycast/api";
import { ClientManager } from "./api/clientManager";
import { setTimeout } from "node:timers/promises";

export default async function Command() {
  closeMainWindow();
  showToast({ title: "Fading all sounds..." });
  const oscClient = ClientManager.initializeOscClient();
  oscClient.fadeAll();
  await setTimeout(5); // just to ensure the message is sent before closing the port
  oscClient.close();
}
