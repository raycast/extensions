import { ActionPanel, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { searchArtists, Artist } from "./utils/youtube";
import { ArtistDetail } from "./components/ArtistDetail";

export default function SearchArtist() {
  const [searchText, setSearchText] = useState("");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!searchText.trim()) {
      setArtists([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const results = await searchArtists(searchText);
        setArtists(results);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Search Failed",
          message: error instanceof Error ? error.message : "Failed to search artists",
        });
        setArtists([]);
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
      searchBarPlaceholder="Search for artists on YouTube Music..."
      throttle
    >
      {artists.length === 0 && searchText.trim() && !isLoading ? (
        <List.EmptyView icon={Icon.Person} title="No Artists Found" description="Try a different search term" />
      ) : (
        artists.map((artist) => (
          <List.Item
            key={artist.id}
            icon={{ source: artist.thumbnail || Icon.Person }}
            title={artist.name}
            accessories={artist.subscriberCount ? [{ text: artist.subscriberCount }] : []}
            actions={
              <ActionPanel>
                <Action.Push title="Show Details" icon={Icon.Eye} target={<ArtistDetail artist={artist} />} />
                <Action.OpenInBrowser title="Open in YouTube Music" url={artist.url} icon={Icon.Globe} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={artist.url}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={artist.name}
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
