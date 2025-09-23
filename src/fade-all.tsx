import { closeMainWindow } from "@raycast/api";
import { ClientManager } from "./api/clientManager";

new ClientManager().fadeAll();
closeMainWindow({ clearRootSearch: true });
