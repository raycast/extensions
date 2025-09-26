import { Action, ActionPanel, closeMainWindow, Color, Detail, Icon, Image, List } from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import { useClientManager } from "../contexts/clientManagerContext";
import { DBSoundTile } from "../types";
import { getTileColorByIndex } from "../utils/helpers";

type SearchCommandProps = { initialSearchText?: string };

export function SearchCommand({ initialSearchText }: SearchCommandProps) {
  const { cm, latestDbUpdate } = useClientManager();

  const allTiles = useMemo(() => {
    return cm?.getAllTiles();
  }, [latestDbUpdate]);

  if (!cm || !allTiles) {
    return <List isLoading={true} />;
  }

  if (!allTiles.length) {
    return <Detail markdown="## No tiles found" />;
  }

  return (
    <List searchText={initialSearchText} isLoading={!allTiles}>
      {allTiles.map((tile) => (
        <TileListItem key={tile.tileUUID} tile={tile} latestDbUpdate={latestDbUpdate} />
      ))}
    </List>
  );
}

type TileListItemProps = { tile: DBSoundTile; latestDbUpdate: number | null };
const TileListItem = React.memo(
  ({ tile, latestDbUpdate }: TileListItemProps) => {
    const { cm } = useClientManager();
    if (!cm) throw new Error(`Client manager instance always expected in TileListItem`);

    const [playing, setPlaying] = useState(false);

    useEffect(() => {
      const baseOscAddress = cm.getTileBaseOscAddress(tile);
      const handler = cm.oscClient.addMessageHandler(new RegExp(`^${baseOscAddress}/currentTime$`), (msg) => {
        const currentTime = (msg.args as [number])[0];
        setPlaying(currentTime > 0);
      });

      return () => cm.oscClient.removeMessageHandler(handler);
    }, []);

    const accessories = useMemo(() => {
      const acc: List.Item.Accessory[] = [];

      if (cm.dataGetter.checkTileForDupliateTitles(tile)) {
        acc.push(
          { text: cm.dataGetter.getSetByUuid(tile.setUuid).title },
          {
            tag: { color: Color.SecondaryText, value: `[${tile.gridPositionX}, ${tile.gridPositionY}]` },
            tooltip: "Duplicate tile title, specifying grid title & tile position.",
          },
        );
      }

      return acc;
    }, [latestDbUpdate]);

    const playStopIcon = playing ? Icon.Stop : Icon.Play;

    const playStopIconColored: Image.ImageLike = playing
      ? {
          source: playStopIcon,
          tintColor: Color.Red,
        }
      : {
          source: playStopIcon,
          tintColor: getTileColorByIndex(tile.colorIndex),
        };

    return (
      <List.Item
        title={{ value: tile.title, tooltip: tile.notes }}
        subtitle={tile.tileIcon.join(" ")}
        icon={playStopIconColored}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action
              title={playing ? "Stop" : "Play"}
              icon={playStopIcon}
              onAction={() => {
                cm.playStopTile(tile);
                closeMainWindow();
              }}
            />
            <Action
              title={`${playing ? "Stop" : "Play"} and Keep Window Open`}
              icon={playStopIcon}
              onAction={() => cm.playStopTile(tile)}
              shortcut={{ key: "enter", modifiers: ["opt"] }}
            />
          </ActionPanel>
        }
      />
    );
  },
  (a, b) => a.latestDbUpdate === b.latestDbUpdate,
);
