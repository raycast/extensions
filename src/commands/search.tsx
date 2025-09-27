import { Action, ActionPanel, closeMainWindow, Color, Detail, Icon, Image, List } from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import { useClientManager } from "../contexts/clientManagerContext";
import { DBSoundTile } from "../types";
import { formatDuration, getTileColorByIndex } from "../utils/helpers";
import { FARRAGO_FADE_DURATION_MS } from "../utils/constants";

export function SearchCommand() {
  const { cm, latestDbUpdate } = useClientManager();
  const [gridFilter, setGridFilter] = useState<string>("");

  const tiles = useMemo(() => {
    const allTiles = cm?.getAllTiles();

    if (!gridFilter) return allTiles;

    return allTiles?.filter((t) => t.setUuid === gridFilter);
  }, [latestDbUpdate, gridFilter]);

  return (
    <List isLoading={!tiles} searchBarAccessory={<FilterBySetDropdown value={gridFilter} onChange={setGridFilter} />}>
      {tiles && tiles.length == 0 ? (
        <List.EmptyView
          title="No Sounds Found"
          description="Add some sets and tiles in Farrago, then call this command again."
          icon={{ source: "🤷🏻‍♂️" }}
        />
      ) : (
        tiles?.map((tile) => (
          <TileListItem
            key={tile.tileUUID}
            tile={tile}
            latestDbUpdate={latestDbUpdate}
            gridFilterExists={!!gridFilter}
          />
        ))
      )}
    </List>
  );
}

type TileListItemProps = { tile: DBSoundTile; latestDbUpdate: number | null; gridFilterExists: boolean };
const TileListItem = React.memo(
  ({ tile, latestDbUpdate, gridFilterExists }: TileListItemProps) => {
    const { cm } = useClientManager();
    if (!cm) throw new Error(`Client manager instance always expected in TileListItem`);

    const tileSet = cm.dataGetter.getSetByUuid(tile.setUuid);
    const tileHasDuplicateTitles = cm.dataGetter.checkTileForDupliateTitles(tile);
    const tileFilePath = cm.fileParser.getFilePathForTile(tile);

    const [playing, setPlaying] = useState(false);
    const [fading, setFading] = useState(false);

    useEffect(() => {
      const baseOscAddress = cm.getTileBaseOscAddress(tile);

      const handlerPlaying = cm.oscClient.addMessageHandler(new RegExp(`^${baseOscAddress}/currentTime$`), (msg) => {
        const currentTime = (msg.args as [number])[0];
        setPlaying(currentTime > 0);
      });

      const handlerFading = cm.oscClient.addMessageHandler(new RegExp(`^${baseOscAddress}/fadeOut$`), (msg) => {
        const fading = (msg.args as unknown as [boolean])[0];
        if (fading) setFading(true);
      });

      return () => {
        cm.oscClient.removeMessageHandler(handlerPlaying);
        cm.oscClient.removeMessageHandler(handlerFading);
      };
    }, []);

    useEffect(() => {
      if (!fading) return;
      const timeout = setTimeout(() => setFading(false), FARRAGO_FADE_DURATION_MS);
      return () => clearTimeout(timeout);
    }, [fading]);

    const accessories = useMemo(() => {
      return [{ text: formatDuration(tile.playerSettings.duration), tooltip: "Duration" }] as List.Item.Accessory[];
    }, [latestDbUpdate]);

    const playStopIcon = playing ? Icon.Stop : Icon.Play;

    const tileIcon: Image.ImageLike = fading
      ? { source: Icon.SpeakerDown, tintColor: Color.SecondaryText }
      : playing
        ? {
            source: Icon.Stop,
            tintColor: Color.Red,
          }
        : {
            source: Icon.Play,
            tintColor: getTileColorByIndex(tile.colorIndex),
          };

    return (
      <List.Item
        title={{ value: tile.title + "  " + tile.tileIcon.join(" "), tooltip: tile.notes }}
        subtitle={{
          value:
            gridFilterExists || !tileHasDuplicateTitles
              ? ""
              : `${tileSet.title} • ${tile.gridPositionX},${tile.gridPositionY}`,
          tooltip: "Duplicate title, specifying set and position.",
        }}
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
                  shortcut={{ key: "f", modifiers: ["opt", "shift"] }}
                />
              ) : null}
              <Action
                title="Toggle AB Volume"
                icon={Icon.Speaker}
                onAction={() => cm.toggleTileDuckVolume(tile)}
                shortcut={{ key: "v", modifiers: ["opt", "shift"] }}
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
              <Action.CopyToClipboard title="Copy File Path" content={tileFilePath} />
              <Action.CopyToClipboard title="Copy File" content={{ file: tileFilePath }} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  },
  (a, b) => a.latestDbUpdate === b.latestDbUpdate && a.gridFilterExists === b.gridFilterExists,
);

type FilterBySetDropdownProps = Pick<List.Dropdown.Props, "value" | "onChange">;
export function FilterBySetDropdown({ value, onChange }: FilterBySetDropdownProps) {
  const { cm, latestDbUpdate } = useClientManager();

  const sets = useMemo(() => {
    if (!cm) return [];

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
