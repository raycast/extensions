import React, { useState, useMemo, useCallback } from "react";
import { ActionPanel, showToast, Toast, getPreferenceValues, List, Action, Icon } from "@raycast/api";
import { periodTypes, Artist } from "./types";
import { useTopArtists } from "./lib/use-lastfm";
import { PeriodDropdown } from "./components/period";
import { ListResults } from "./components/list";


// Memoized action panel component
const ArtistActionPanel = React.memo(({ artist }: { artist: Artist }) => (
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
));

ArtistActionPanel.displayName = "ArtistActionPanel";

const TopArtists: React.FC = () => {
  const preferences = getPreferenceValues();
  const { period: defaultPeriod } = preferences;
  const [period, setPeriod] = useState<periodTypes>(defaultPeriod);
  const { loading, error, artists } = useTopArtists({ period });

  // Memoized period change handler
  const onPeriodChange = useCallback((value: string) => {
    setPeriod(value as periodTypes);
  }, []);

  // Memoized data processing
  const processedData = useMemo(() => {
    return artists.map((artist, idx) => {
      return {
        key: `${artist.name}-${idx}`,
        title: artist.name,
        subtitle: undefined,
        icon: Icon.Person,
        accessories: [{ text: artist.playcount ? `${artist.playcount} plays` : null }],
        accessory: artist.playcount ? { tooltip: artist.playcount } : undefined,
        actions: <ArtistActionPanel artist={artist as Artist} />,
      };
    });
  }, [artists]);

  if (error !== null) {
    showToast(Toast.Style.Failure, "Something went wrong.", String(error));
    return (
      <List isLoading={false}>
        <List.EmptyView title="Something went wrong" description={String(error)} />
      </List>
    );
  }

  // Memoized search bar accessory
  const searchBarAccessory = useMemo(
    () => <PeriodDropdown selectedPeriod={period} onPeriodChange={onPeriodChange} />,
    [period, onPeriodChange]
  );

  return (
    <List isLoading={loading} searchBarPlaceholder="Search artists..." searchBarAccessory={searchBarAccessory}>
      <ListResults items={processedData} />
    </List>
  );
};

export default TopArtists;
