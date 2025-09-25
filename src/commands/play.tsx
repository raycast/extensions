import { closeMainWindow, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { TileCoordinates } from "../types";
import { ClientManager } from "../api/clientManager";
import { setTimeout } from "timers/promises";

export type PlayCommandProps = LaunchProps<{
  arguments: { tileTitle: string };
  launchContext: { tileCoordinates: TileCoordinates | null };
}>;

export async function runPlayCommand(props: PlayCommandProps) {
  const { tileTitle } = props.arguments;
  const { tileCoordinates } = props.launchContext ?? {};

  if (tileCoordinates) {
    const oscClient = ClientManager.initializeOscClient();
    oscClient.togglePlayTile(tileCoordinates);
    await setTimeout(5); // just to ensure the message is sent before closing the port
    oscClient.close();
    closeMainWindow();
    return;
  }

  const cm = new ClientManager();
  cm.refreshData();

  const matchingTiles = cm.dataGetter.getTilesWithTitle(tileTitle);

  if (!matchingTiles.size) {
    showToast({
      title: "error",
      message: `No exact matches found for "${tileTitle}"`,
      style: Toast.Style.Failure,
    });
    return;
  }

  if (matchingTiles.size === 1) {
    const tileUuid = matchingTiles.values().next().value!;
    const tile = cm.dataGetter.getTileByUuid(tileUuid);
    cm.playTile(tile);
    closeMainWindow();
    showHUD(`Playing "${tile.title}"`);
    await setTimeout(5); // just to ensure the message is sent before closing the port
    cm.oscClient.close();
    return;
  }

  showToast({
    title: "error",
    message: `Multiple matches found for "${tileTitle}". Please deduplicate tile titles in Farrago.`,
    style: Toast.Style.Failure,
  });
}
