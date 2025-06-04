import React, { useState } from "react";
import { ActionPanel, showToast, Toast, getPreferenceValues, List, Grid, Action } from "@raycast/api";
import { periodTypes, Artist } from "./types";
import { useTopArtists } from "./lib/use-lastfm";
import { PeriodDropdown } from "./components/period";
import { ListResults } from "./components/list";
import { GridResults } from "./components/grid";

const TopArtists: React.FC = () => {
  const { period: defaultPeriod, view } = getPreferenceValues();
  const [period, setPeriod] = useState<periodTypes>(defaultPeriod);
  const { loading, error, artists, revalidate } = useTopArtists({ period });

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

  const data = artists.map((artist, idx) => {
    const image = artist.image?.find((img) => img.size === "large")?.["#text"] || "";
    return {
      key: `${artist.name}-${idx}`,
      title: artist.name,
      subtitle: undefined,
      icon: view === "list" ? image : undefined,
      content: view === "grid" ? image : undefined,
      accessories: [{ text: artist.playcount ? `${artist.playcount} plays` : null }],
      accessory: artist.playcount ? { tooltip: artist.playcount } : undefined,
      actions: (
        <ActionPanel>
          <ActionPanel.Section title="Open And Search">
            <Action.OpenInBrowser url={artist.url} title="Open on Last.fm" />
            <Action.OpenInBrowser
              url={`https://open.spotify.com/search/${encodeURIComponent(artist.name)}`}
              title="Search on Spotify"
            />
            <Action.OpenInBrowser
              url={`https://music.apple.com/search?term=${encodeURIComponent(artist.name)}`}
              title="Search on Apple Music"
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy URL to Clipboard" content={artist.url} />
            <Action.CopyToClipboard title="Copy Name to Clipboard" content={artist.name} />
          </ActionPanel.Section>
        </ActionPanel>
      ),
    };
  });

  if (view === "grid") {
    return (
      <Grid
        isLoading={loading}
        searchBarPlaceholder="Search artists..."
        searchBarAccessory={<PeriodDropdown selectedPeriod={period} onPeriodChange={onPeriodChange} />}
      >
        <GridResults items={data} />
      </Grid>
    );
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search artists..."
      searchBarAccessory={<PeriodDropdown selectedPeriod={period} onPeriodChange={onPeriodChange} />}
    >
      <ListResults items={data} />
    </List>
  );
};

export default TopArtists;
