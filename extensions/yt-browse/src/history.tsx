import { List, ActionPanel, Action, Icon, Image } from "@raycast/api";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { VideoResult } from "./youtube-api";
import { openYouTubeURL, fetchRealHistory, HistoryVideo } from "./webapp";
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

  // Try real history first (via Safari JS), fall back to search-based
  const { data: realHistory, isLoading: realLoading } = useQuery({
    queryKey: ["youtube", "real-history"],
    queryFn: fetchRealHistory,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const { data: fakeHistory, isLoading: fakeLoading } = useQuery({
    queryKey: historyKey,
    queryFn: fetchHistory,
    enabled: !realHistory || realHistory.length === 0,
  });

  const showLoading =
    (realLoading && !realHistory) ||
    (fakeLoading && !realHistory && cached.length === 0);

  // Use real history if available, otherwise fall back to fake
  const realResults: VideoResult[] = (realHistory ?? []).map(
    (v: HistoryVideo) => ({
      id: v.id,
      title: v.title,
      description: "",
      channel: v.channel,
      url: v.url,
      thumbnail: v.thumbnail,
      duration: v.duration,
      views: null,
      uploadedAt: null,
    }),
  );

  const results =
    realResults.length > 0 ? realResults : (fakeHistory ?? cached);
  const usingRealHistory = realResults.length > 0;

  return (
    <List isLoading={showLoading} searchBarPlaceholder="Filter videos...">
      {!usingRealHistory && !showLoading && (
        <List.Section title="Tip: Enable Safari JavaScript for real history">
          {results.map((video) => (
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
                  ? {
                      source: video.thumbnail,
                      mask: Image.Mask.RoundedRectangle,
                    }
                  : Icon.Video
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Open in Web App"
                    icon={Icon.Play}
                    onAction={() => openYouTubeURL(video.url)}
                  />
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={video.url}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {usingRealHistory &&
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
                  title="Open in Web App"
                  icon={Icon.Play}
                  onAction={() => openYouTubeURL(video.url)}
                />
                <Action.OpenInBrowser title="Open in Browser" url={video.url} />
              </ActionPanel>
            }
          />
        ))}
      {!usingRealHistory && !showLoading && results.length === 0 && (
        <List.EmptyView
          title="No history found"
          description="Enable Safari JavaScript in Setup YouTube for real watch history"
          icon={{ source: Icon.ExclamationMark }}
        />
      )}
    </List>
  );
}

export default withQueryClient(HistoryCommand);
