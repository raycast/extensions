import { ActionPanel, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { searchSongs, Song } from "./utils/youtube";

export default function SearchSong() {
  const [searchText, setSearchText] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!searchText.trim()) {
      setSongs([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const results = await searchSongs(searchText);
        setSongs(results);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Search Failed",
          message: error instanceof Error ? error.message : "Failed to search songs",
        });
        setSongs([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(search, 500);
    return () => clearTimeout(debounce);
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for songs on YouTube Music..."
      throttle
    >
      {songs.length === 0 && searchText.trim() && !isLoading ? (
        <List.EmptyView icon={Icon.Music} title="No Songs Found" description="Try a different search term" />
      ) : (
        songs.map((song) => (
          <List.Item
            key={song.id}
            icon={{ source: song.thumbnail || Icon.Music }}
            title={song.title}
            subtitle={song.artist}
            accessories={[{ text: song.duration }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Play in YouTube Music" url={song.url} icon={Icon.Play} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={song.url}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Title"
                  content={song.title}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
