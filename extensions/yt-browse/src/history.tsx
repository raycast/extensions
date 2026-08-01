import { List, ActionPanel, Action, Icon, Image } from "@raycast/api";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { openYouTubeURL, HistoryVideo } from "./webapp";
import { fetchHistory, getHistoryFromCache, historyKey } from "./query";
import { withQueryClient } from "./with-query";

function HistoryCommand() {
  const [cached, setCached] = useState<HistoryVideo[]>([]);

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
          title="Couldn't fetch history"
          description="Make sure Safari is running and 'Allow JavaScript from Apple Events' is enabled. Run Setup YouTube."
          icon={{
            source: Icon.ExclamationMark,
            tintColor: { light: "red", dark: "red" },
          }}
        />
      ) : results.length === 0 && !showLoading ? (
        <List.EmptyView
          title="No history found"
          description="Open YouTube in Safari and watch some videos first, then run Setup YouTube."
          icon={{ source: Icon.ExclamationMark }}
        />
      ) : (
        results.map((video) => (
          <List.Item
            key={video.id}
            title={video.title}
            subtitle={video.channel}
            accessories={[
              video.duration ? { text: video.duration } : {},
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
        ))
      )}
    </List>
  );
}

export default withQueryClient(HistoryCommand);
