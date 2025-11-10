import { ActionPanel, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { searchAlbums, Album } from "./utils/youtube";
import { AlbumDetail } from "./components/AlbumDetail";

export default function SearchAlbum() {
  const [searchText, setSearchText] = useState("");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!searchText.trim()) {
      setAlbums([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const results = await searchAlbums(searchText);
        setAlbums(results);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Search Failed",
          message: error instanceof Error ? error.message : "Failed to search albums",
        });
        setAlbums([]);
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
      searchBarPlaceholder="Search for albums on YouTube Music..."
      throttle
    >
      {albums.length === 0 && searchText.trim() && !isLoading ? (
        <List.EmptyView
          icon={Icon.AppWindowGrid3x3}
          title="No Albums Found"
          description="Try a different search term"
        />
      ) : (
        albums.map((album) => (
          <List.Item
            key={album.id}
            icon={{ source: album.thumbnail || Icon.AppWindowGrid3x3 }}
            title={album.title}
            subtitle={album.artist}
            accessories={album.itemCount ? [{ text: `${album.itemCount} songs` }] : []}
            actions={
              <ActionPanel>
                <Action.Push title="Show Songs" icon={Icon.List} target={<AlbumDetail album={album} />} />
                <Action.OpenInBrowser title="Open in YouTube Music" url={album.url} icon={Icon.Globe} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={album.url}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Title"
                  content={album.title}
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
