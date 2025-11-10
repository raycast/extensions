import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { Album, getPlaylistTracks, Song } from "../utils/youtube";

interface AlbumDetailProps {
  album: Album;
}

export function AlbumDetail({ album }: AlbumDetailProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTracks = async () => {
      setIsLoading(true);
      try {
        const tracks = await getPlaylistTracks(album.id);
        setSongs(tracks);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load Songs",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTracks();
  }, [album.id]);

  return (
    <List isLoading={isLoading} navigationTitle={album.title} searchBarPlaceholder="Search songs in this album...">
      <List.Section title={`${album.title} by ${album.artist}`} subtitle={`${songs.length} songs`}>
        {songs.map((song, index) => (
          <List.Item
            key={song.id}
            icon={{ source: song.thumbnail || Icon.Music }}
            title={`${index + 1}. ${song.title}`}
            subtitle={song.artist}
            accessories={[{ text: song.duration }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Play in YouTube Music" url={song.url} icon={Icon.Play} />
                <Action.OpenInBrowser
                  title="Open Album"
                  url={album.url}
                  icon={Icon.AppWindowGrid3x3}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.CopyToClipboard
                  title="Copy Song URL"
                  content={song.url}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Album URL"
                  content={album.url}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
