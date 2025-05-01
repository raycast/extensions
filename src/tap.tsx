import { List, Icon, Color } from "@raycast/api";
import { useState, useCallback } from "react";
import { TapData, updateTapData, TempoConfig, DEFAULT_CONFIG } from "./tempoCalculator";

export default function Command() {
  // Custom configuration - could be loaded from preferences in the future
  const [config] = useState<TempoConfig>({
    ...DEFAULT_CONFIG,
    // Override any defaults here if needed
    decimalPlaces: 1, // Show 1 decimal place
    smoothingFactor: 0.4, // Higher initial smoothing, will adapt based on tap consistency
    tempoChangeThreshold: 1.7, // Slightly more sensitive tempo change detection
    pauseThreshold: 1500, // 1.5 seconds pause indicates potential tempo change
  });

  const [tapData, setTapData] = useState<TapData>({
    timestamps: [],
    bpm: null,
    rawBpm: null,
    variance: null,
    recentIntervals: [],
    tempoChangeDetected: false,
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
        console.log("Variance:", newTapData.variance);
        console.log("Tempo change detected:", newTapData.tempoChangeDetected);

        setTapData(newTapData);
      }

      setSearchText(newText);
    },
    [searchText, tapData, config],
  );

  const getLastTapTime = useCallback((timestamps: ReadonlyArray<number>) => {
    return timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]).toLocaleTimeString() : "None";
  }, []);

  // Get variance indicator based on tapData.variance
  const getConsistencyIndicator = useCallback((variance: number | null) => {
    if (variance === null) return { text: "Consistency: N/A", color: Color.SecondaryText };

    // Lower variance = more consistent
    if (variance < 500) return { text: "Consistency: Excellent", color: Color.Green };
    if (variance < 2000) return { text: "Consistency: Good", color: Color.Blue };
    if (variance < 10000) return { text: "Consistency: Average", color: Color.Yellow };
    return { text: "Consistency: Poor", color: Color.Red };
  }, []);

  const getTapCount = useCallback((timestamps: ReadonlyArray<number>) => {
    return `${timestamps.length} tap${timestamps.length !== 1 ? "s" : ""}`;
  }, []);

  const getTitle = useCallback((data: TapData) => {
    if (!data.bpm) return "Tap Tempo";

    if (data.tempoChangeDetected) {
      return `${data.bpm} BPM ↻ New Tempo`;
    }

    return `${data.bpm} BPM`;
  }, []);

  return (
    <List onSearchTextChange={handleSearchTextChange} searchBarPlaceholder="Tap any key to the beat...">
      {tapData.bpm ? (
        <List.Item
          icon={tapData.tempoChangeDetected ? Icon.ArrowClockwise : Icon.Heartbeat}
          title={getTitle(tapData)}
          subtitle={`Raw: ${tapData.rawBpm} BPM`}
          accessories={[
            {
              text: getTapCount(tapData.timestamps),
              icon: Icon.Dot,
              tooltip: `Based on ${tapData.timestamps.length} taps`,
            },
            {
              text: getConsistencyIndicator(tapData.variance).text,
              icon: Icon.Dot,
              tooltip: tapData.variance !== null ? `Variance: ${Math.round(tapData.variance)}` : undefined,
              tag: {
                value: getConsistencyIndicator(tapData.variance).text.split(": ")[1],
                color: tapData.tempoChangeDetected ? Color.Purple : getConsistencyIndicator(tapData.variance).color,
              },
            },
            {
              text: `Last tap: ${getLastTapTime(tapData.timestamps)}`,
            },
          ]}
        />
      ) : (
        <List.EmptyView title="Tap Tempo" description="Tap any key repeatedly to calculate BPM" />
      )}
    </List>
  );
}
