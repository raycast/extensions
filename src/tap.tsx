import { List, Icon } from "@raycast/api";
import { useState, useCallback } from "react";
import { TapData, updateTapData } from "./tempoCalculator";

export default function Command() {
  const [tapData, setTapData] = useState<TapData>({
    timestamps: [],
    bpm: null,
  });

  const [searchText, setSearchText] = useState("");

  const handleSearchTextChange = useCallback(
    (newText: string) => {
      // Only register a "tap" when a character is added
      if (newText.length > searchText.length) {
        const now = Date.now();

        // Create new tap data immutably
        const newTapData = updateTapData(tapData, now);

        // Log data to console
        console.log("Tap timestamp:", now);
        console.log(
          "Tap intervals:",
          newTapData.timestamps.length >= 2
            ? Array.from(newTapData.timestamps.slice(1)).map((t, i) => t - newTapData.timestamps[i])
            : [],
        );
        console.log("Current BPM:", newTapData.bpm);

        setTapData(newTapData);
      }

      setSearchText(newText);
    },
    [searchText, tapData],
  );

  const getLastTapTime = useCallback((timestamps: ReadonlyArray<number>) => {
    return timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]).toLocaleTimeString() : "None";
  }, []);

  return (
    <List onSearchTextChange={handleSearchTextChange} searchBarPlaceholder="Tap any key to the beat...">
      {tapData.bpm ? (
        <List.Item
          icon={Icon.Heartbeat}
          title={`${tapData.bpm} BPM`}
          subtitle={`Based on ${tapData.timestamps.length} taps`}
          accessories={[{ text: `Last tap: ${getLastTapTime(tapData.timestamps)}` }]}
        />
      ) : (
        <List.EmptyView title="Tap Tempo" description="Tap any key repeatedly to calculate BPM" />
      )}
    </List>
  );
}
