import React, { useMemo } from "react";
import { ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import type { TopTrack } from "@/types/SongResponse";

const createTrackActions = (track: TopTrack) => (
  <ActionPanel>
    <ActionPanel.Section title="Open And Search">
      <Action.OpenInBrowser url={track.url} title="Open on Last.fm" />
      <Action.OpenInBrowser
        url={`https://open.spotify.com/search/${encodeURIComponent(`${track.artist.name} - ${track.name}`)}`}
        title="Search on Spotify"
      />
      <Action.OpenInBrowser
        url={`https://music.apple.com/search?term=${encodeURIComponent(`${track.artist.name} - ${track.name}`)}`}
        title="Search on Apple Music"
      />
    </ActionPanel.Section>
    <ActionPanel.Section title="Copy">
      <Action.CopyToClipboard title="Copy URL to Clipboard" content={track.url} />
      <Action.CopyToClipboard title="Copy Name and Artist" content={`${track.artist.name} - ${track.name}`} />
    </ActionPanel.Section>
  </ActionPanel>
);

export const useTopSongs = (tracks: TopTrack[]) => {
  const processedData = useMemo(() => {
    const { view } = getPreferenceValues();
    
    return tracks.map((track, idx) => {
      const image = track.image?.find((img) => img.size === "large")?.["#text"] || "";

      return {
        key: `${track.name}-${idx}`,
        title: track.name,
        subtitle: track.artist ? `by ${track.artist.name}` : undefined,
        icon: view === "list" ? image : undefined,
        content: view === "grid" ? image : undefined,
        accessories: [{ text: track.playcount ? `${track.playcount} plays` : null }],
        accessory: track.playcount ? { tooltip: track.playcount } : undefined,
        actions: createTrackActions(track),
      };
    });
  }, [tracks]);

  return { processedData };
};