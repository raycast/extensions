import { List, ActionPanel, Action, Icon, Image } from "@raycast/api";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { VideoResult } from "./youtube-api";
import { openYouTube } from "./webapp";
import { fetchHistory, getHistoryFromCache, historyKey } from "./query";
import { withQueryClient } from "./with-query";

function formatViews(views: number | null): string | undefined {
  if (!views) return undefined;
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views} views`;
}

function HistoryCommand() {
  const [cached, setCached] = useState<VideoResult[]>([]);

  useEffect(() => {
    getHistoryFromCache().then((c) => {
      if (c && c.length > 0) setCached(c);
    });
  }, []);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: historyKey,
    queryFn: fetchHistory,
  });

  const results = data ?? cached;
  const showLoading = isLoading && cached.length === 0;
  const showRefetching = isFetching && cached.length > 0;
  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <List
      isLoading={showLoading || showRefetching}
      searchBarPlaceholder="Filter videos..."
    >
      {errorMessage && !results.length ? (
        <List.EmptyView
          title="Error"
          description={errorMessage}
          icon={{
            source: Icon.ExclamationMark,
            tintColor: { light: "red", dark: "red" },
          }}
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
                  title="Continue Watching"
                  icon={Icon.Play}
                  onAction={() => openYouTube()}
                />
                <Action.OpenInBrowser title="Open in Browser" url={video.url} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default withQueryClient(HistoryCommand);
