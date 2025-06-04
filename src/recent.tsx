import React from "react";
import { ActionPanel, showToast, Toast, getPreferenceValues, List, Grid, Action } from "@raycast/api";
import { Track } from "./types";
import { useRecentTracks } from "./lib/use-lastfm";
import { ListResults } from "./components/list";
import { GridResults } from "./components/grid";

const RecentTracks: React.FC = () => {
  const { view } = getPreferenceValues();
  const { loading, error, songs, revalidate } = useRecentTracks();

  if (error !== null) {
    showToast(Toast.Style.Failure, "Something went wrong.", String(error));
    return (
      <List isLoading={false}>
        <List.EmptyView title="Something went wrong" description={String(error)} />
      </List>
    );
  }

  const data = songs.map((song, idx) => {
    const track = song as Track;
    const image = track.image?.find((img) => img.size === "large")?.["#text"] || "";
    const artist = track.artist?.["#text"] || "";
    const nowPlaying = track["@attr"]?.nowplaying || false;

    return {
      key: `${track.name}-${idx}`,
      title: track.name,
      subtitle: artist ? `by ${artist}` : undefined,
      icon: view === "list" ? image : undefined,
      content: view === "grid" ? image : undefined,
      accessories: [{ text: nowPlaying ? "Now Playing" : null }],
      accessory: nowPlaying ? { tooltip: "Currently playing" } : undefined,
      actions: (
        <ActionPanel>
          <ActionPanel.Section title="Open And Search">
            <Action.OpenInBrowser url={track.url} title="Open on Last.fm" />
            <Action.OpenInBrowser
              url={`https://open.spotify.com/search/${encodeURIComponent(`${artist} - ${track.name}`)}`}
              title="Search on Spotify"
            />
            <Action.OpenInBrowser
              url={`https://music.apple.com/search?term=${encodeURIComponent(`${artist} - ${track.name}`)}`}
              title="Search on Apple Music"
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy URL to Clipboard" content={track.url} />
            <Action.CopyToClipboard title="Copy Name and Artist" content={`${track.name} - ${artist}`} />
          </ActionPanel.Section>
        </ActionPanel>
      ),
    };
  });

  if (view === "grid") {
    return (
      <Grid isLoading={loading} searchBarPlaceholder="Search recent tracks...">
        <GridResults items={data} />
      </Grid>
    );
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search recent tracks...">
      <ListResults items={data} />
    </List>
  );
};

export default RecentTracks;
