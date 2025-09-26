import { Action, ActionPanel, closeMainWindow, Color, Detail, Icon, Image, List } from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import { useClientManager } from "../contexts/clientManagerContext";
import { DBSoundTile } from "../types";
import { getTileColorByIndex } from "../utils/helpers";

export function SearchCommand() {
  const { cm, latestDbUpdate } = useClientManager();
  const [gridFilter, setGridFilter] = useState<string>("");

  const tiles = useMemo(() => {
    const allTiles = cm?.getAllTiles();

    if (!gridFilter) return allTiles;

    return allTiles?.filter((t) => t.setUuid === gridFilter);
  }, [latestDbUpdate, gridFilter]);

  if (!cm || !tiles) {
    return <List isLoading={true} />;
  }

  if (!tiles.length) {
    return <Detail markdown="## No tiles found" />;
  }

  return (
    <List isLoading={!tiles} searchBarAccessory={<FilterBySetDropdown value={gridFilter} onChange={setGridFilter} />}>
      {tiles.map((tile) => (
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

    const tileIcon: Image.ImageLike = playing
      ? {
          source: Icon.Stop,
          tintColor: Color.Red,
        }
      : {
          source: Icon.Play,
          tintColor: getTileColorByIndex(tile.colorIndex),
        };

    const filePath = cm.fileParser.getFilePathForTile(tile);

    return (
      <List.Item
        title={{ value: tile.title, tooltip: tile.notes }}
        subtitle={tile.tileIcon.join(" ")}
        icon={tileIcon}
        accessories={accessories}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
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
              {playing ? (
                <Action
                  title="Fade"
                  icon={Icon.SpeakerDown}
                  onAction={() => cm.fadeTile(tile)}
                  shortcut={{ key: "f", modifiers: ["cmd", "shift"] }}
                />
              ) : null}
              <Action
                title="Toggle AB Volume"
                icon={Icon.Speaker}
                onAction={() => cm.toggleTileDuckVolume(tile)}
                shortcut={{ key: "v", modifiers: ["cmd", "shift"] }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Tile Title"
                content={tile.title}
                shortcut={{ key: "c", modifiers: ["cmd"] }}
              />
              <Action.CopyToClipboard
                title="Copy Tile UUID"
                content={tile.tileUUID}
                shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
              />
              <Action.CopyToClipboard title="Copy File Path" content={filePath} />
              <Action.CopyToClipboard title="Copy File" content={{ file: filePath }} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  },
  (a, b) => a.latestDbUpdate === b.latestDbUpdate,
);

type FilterBySetDropdownProps = Pick<List.Dropdown.Props, "value" | "onChange">;
export function FilterBySetDropdown({ value, onChange }: FilterBySetDropdownProps) {
  const { cm, latestDbUpdate } = useClientManager();
  if (!cm) throw new Error(`Client manager instance always expected in FilterBySetDropdown`);

  const sets = useMemo(() => {
    const allSets = cm.getAllSets();

    if (value && !allSets.find((s) => s.uuid === value)) {
      onChange?.("");
    }

    return allSets;
  }, [latestDbUpdate]);

  return (
    <List.Dropdown tooltip="Filter by Set" value={value} onChange={onChange}>
      <List.Dropdown.Item title="All Sets" value="" icon={Icon.List} />
      {sets.map((set) => (
        <List.Dropdown.Item key={set.uuid} title={set.title} value={set.uuid} icon={Icon.Folder} />
      ))}
    </List.Dropdown>
  );
}
