import { List, Icon } from "@raycast/api";
import { useState, useCallback } from "react";
import { TapData, updateTapData, TempoConfig, DEFAULT_CONFIG } from "./tempoCalculator";

export default function Command() {
  // Custom configuration - could be loaded from preferences in the future
  const [config] = useState<TempoConfig>({
    ...DEFAULT_CONFIG,
    // Override any defaults here if needed
    decimalPlaces: 0, // Show 1 decimal place
    smoothingFactor: 0.9, // Slightly stronger smoothing than default
  });

  const [tapData, setTapData] = useState<TapData>({
    timestamps: [],
    bpm: null,
    rawBpm: null,
  });

  const [searchText, setSearchText] = useState("");

  const handleSearchTextChange = useCallback(
    (newText: string) => {
      // Only register a "tap" when a character is added
      if (newText.length > searchText.length) {
        const now = Date.now();

        // Create new tap data immutably with the current config
        const newTapData = updateTapData(tapData, now, config);

        // Log data to console
        console.log("Tap timestamp:", now);
        console.log(
          "Tap intervals:",
          newTapData.timestamps.length >= 2
            ? Array.from(newTapData.timestamps.slice(1)).map((t, i) => t - newTapData.timestamps[i])
            : [],
        );
        console.log("Raw BPM:", newTapData.rawBpm);
        console.log("Smoothed BPM:", newTapData.bpm);

        setTapData(newTapData);
      }

      setSearchText(newText);
    },
    [searchText, tapData, config],
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
          subtitle={`Based on ${tapData.timestamps.length} taps${tapData.rawBpm !== tapData.bpm ? ` (Raw: ${tapData.rawBpm})` : ""}`}
          accessories={[{ text: `Last tap: ${getLastTapTime(tapData.timestamps)}` }]}
        />
      ) : (
        <List.EmptyView title="Tap Tempo" description="Tap any key repeatedly to calculate BPM" />
      )}
    </List>
  );
}
