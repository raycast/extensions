import { ActionPanel, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { searchPlaylists, Playlist } from "./utils/youtube";

export default function SearchPlaylist() {
  const [searchText, setSearchText] = useState("");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!searchText.trim()) {
      setPlaylists([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const results = await searchPlaylists(searchText);
        setPlaylists(results);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Search Failed",
          message: error instanceof Error ? error.message : "Failed to search playlists",
        });
        setPlaylists([]);
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
      searchBarPlaceholder="Search for playlists on YouTube Music..."
      throttle
    >
      {playlists.length === 0 && searchText.trim() && !isLoading ? (
        <List.EmptyView icon={Icon.List} title="No Playlists Found" description="Try a different search term" />
      ) : (
        playlists.map((playlist) => (
          <List.Item
            key={playlist.id}
            icon={{ source: playlist.thumbnail || Icon.List }}
            title={playlist.title}
            subtitle={playlist.channelTitle}
            accessories={playlist.itemCount ? [{ text: `${playlist.itemCount} songs` }] : []}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in YouTube Music" url={playlist.url} icon={Icon.Globe} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={playlist.url}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Title"
                  content={playlist.title}
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
