import React, { useState } from "react";
import {
  ActionPanel,
  showToast,
  ToastStyle,
  getPreferenceValues,
  List,
  OpenInBrowserAction,
  Icon,
  CopyToClipboardAction,
  Toast,
  Action,
  Grid,
} from "@raycast/api";

// Hooks
import useLastFm from "./hooks/useLastfm";

// Types
import type { TopTrack } from "@/types/SongResponse";
import { periodTypes } from "./types";
import { useTopTracks } from "./lib/use-lastfm";
import { PeriodDropdown } from "./components/period";
import { ListResults } from "./components/list";
// Remove unused import
import { GridResults } from "./components/grid";

interface ItemProps {
  key: string;
  title: string;
  subtitle?: string;
  icon?: string;
  content?: string;
  accessories?: Array<{ text: string | null }>;
  accessory?: { tooltip: string };
  actions: React.ReactNode;
}

export const processSongItem = (track: TopTrack, idx: number): ItemProps => {
  const { view } = getPreferenceValues();
  const image = track.image?.find((img) => img.size === "large")?.["#text"] || "";

  return {
    key: `${track.name}-${idx}`,
    title: track.name,
    subtitle: track.artist ? `by ${track.artist.name}` : undefined,
    icon: view === "list" ? image : undefined,
    content: view === "grid" ? image : undefined,
    accessories: [{ text: track.playcount ? `${track.playcount} plays` : null }],
    accessory: track.playcount ? { tooltip: track.playcount } : undefined,
    actions: (
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
    ),
  };
};

const TopSongs: React.FC = () => {
  const { period: defaultPeriod, view } = getPreferenceValues();
  const [period, setPeriod] = useState<periodTypes>(defaultPeriod);
  const { loading, error, songs, revalidate } = useTopTracks({ period });

  if (error !== null) {
    showToast(Toast.Style.Failure, "Something went wrong.", String(error));
    return (
      <List isLoading={false}>
        <List.EmptyView title="Something went wrong" description={String(error)} />
      </List>
    );
  }

  function onPeriodChange(value: string) {
    setPeriod(value as periodTypes);
    revalidate();
  }

  const data = songs.map((track, idx) => processSongItem(track as TopTrack, idx));

  if (view === "grid") {
    return (
      <Grid
        isLoading={loading}
        searchBarPlaceholder="Search songs..."
        searchBarAccessory={<PeriodDropdown selectedPeriod={period} onPeriodChange={onPeriodChange} />}
      >
        <GridResults items={data} />
      </Grid>
    );
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search songs..."
      searchBarAccessory={<PeriodDropdown selectedPeriod={period} onPeriodChange={onPeriodChange} />}
    >
      <ListResults items={data} />
    </List>
  );
};

export default TopSongs;
