import { Action, ActionPanel, closeMainWindow, Color, Detail, Icon, LaunchProps, List } from "@raycast/api";
import React, { useMemo } from "react";
import { createDeeplink } from "@raycast/utils";
import { useClientManager } from "../contexts/clientManagerContext";
import { DBSoundTile } from "../types";

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

    return (
      <List.Item
        title={tile.title}
        subtitle={tile.tileIcon.join(" ")}
        icon={Icon.Play}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action
              title="Play"
              icon={Icon.Play}
              onAction={() => {
                cm.playTile(tile);
                closeMainWindow();
              }}
            />
            <Action
              title="Play and Keep Window Open"
              icon={Icon.Play}
              onAction={() => cm.playTile(tile)}
              shortcut={{ key: "enter", modifiers: ["opt"] }}
            />
            <Action.CreateQuicklink
              title="Create Quicklink"
              quicklink={{
                link: createDeeplink({
                  command: "play",
                  arguments: { tileCoordinates: JSON.stringify(cm.getTileCoordinates(tile)) },
                }),
              }}
            />
          </ActionPanel>
        }
      />
    );
  },
  (a, b) => a.latestDbUpdate === b.latestDbUpdate,
);
