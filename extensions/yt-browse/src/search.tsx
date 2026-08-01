import {
  List,
  ActionPanel,
  Action,
  Icon,
  LaunchProps,
  Image,
} from "@raycast/api";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchVideos } from "./youtube-api";
import { openYouTubeURL } from "./webapp";
import { withQueryClient } from "./with-query";

interface SearchArguments {
  query?: string;
}

function formatViews(views: number | null): string | undefined {
  if (!views) return undefined;
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views} views`;
}

function SearchCommand(props: LaunchProps<{ arguments: SearchArguments }>) {
  const [searchText, setSearchText] = useState(props.arguments.query || "");

  const {
    data: results = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["youtube", "search", searchText.trim()],
    queryFn: () => searchVideos(searchText.trim()),
    enabled: searchText.trim().length > 0,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search videos on YouTube..."
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {errorMessage && !isLoading ? (
        <List.EmptyView
          title="Search Error"
          description={errorMessage.slice(0, 500)}
          icon={{
            source: Icon.ExclamationMark,
            tintColor: { light: "red", dark: "red" },
          }}
        />
      ) : results.length === 0 && !isLoading && searchText.trim() ? (
        <List.EmptyView
          title="No results found"
          description={`No videos found for "${searchText}"`}
        />
      ) : (
        results.map((video) => (
          <List.Item
            key={video.id}
            title={video.title}
            subtitle={video.channel}
            accessories={[
              video.duration ? { text: video.duration } : {},
              formatViews(video.views)
                ? { text: formatViews(video.views) }
                : {},
            ].filter((a) => Object.keys(a).length > 0)}
            icon={
              video.thumbnail
                ? { source: video.thumbnail, mask: Image.Mask.RoundedRectangle }
                : Icon.Video
            }
            actions={
              <ActionPanel>
                <Action
                  title="Open in YouTube"
                  icon={Icon.Play}
                  onAction={() => openYouTubeURL(video.url)}
                />
                <Action.OpenInBrowser title="Open in Browser" url={video.url} />
                <Action.CopyToClipboard title="Copy URL" content={video.url} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default withQueryClient(SearchCommand);
