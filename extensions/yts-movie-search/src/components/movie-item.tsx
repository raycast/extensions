import React from "react";
import { Grid, ActionPanel, Action, Icon, showToast, Toast, Clipboard } from "@raycast/api";
import { Movie } from "../types";
import {
  getProxiedImageUrl,
  getHighestQuality,
  generateMagnetLink,
  filterAndSortTorrents,
  formatQualityWithHDR,
} from "../utils";
import { MovieDetails } from "../movie-details";
import { useBookmarks } from "../hooks";

interface MovieItemProps {
  movie: Movie;
  push: (component: React.JSX.Element) => void;
  cycleSortOptions: () => void;
  showRefreshAction?: boolean;
  onRefreshBookmarks?: () => Promise<void> | void;
  isRefreshing?: boolean;
  hasNewQuality?: boolean;
}

export const MovieItem = React.memo(function MovieItem({
  movie,
  push,
  cycleSortOptions,
  showRefreshAction = false,
  onRefreshBookmarks,
  isRefreshing = false,
  hasNewQuality = false,
}: MovieItemProps) {
  const qualityInfo = getHighestQuality(movie.torrents || []);
  const rating = movie.rating ? `★${movie.rating}` : "No rating";
  const { isBookmarked, toggleBookmark, acknowledgeQualityUpdate } = useBookmarks();
  const bookmarked = isBookmarked(movie.id);
  const sortedTorrents = filterAndSortTorrents(movie.torrents || []);
  const bestTorrent = sortedTorrents[0];
  const accessory: Grid.Item.Accessory = {
    icon: { source: qualityInfo.icon, tintColor: qualityInfo.color },
    tooltip: `Quality: ${movie.torrents?.map((t) => t.quality).join(", ") || "Unknown"}`,
  };
  const baseSubtitle = `${movie.year && movie.year > 0 ? movie.year : "Unknown Year"} ${rating}`;
  let subtitle = baseSubtitle;

  if (hasNewQuality) {
    subtitle += `\n✨ New Quality Available${bookmarked ? " • 📍" : ""}`;
  } else if (bookmarked) {
    subtitle += `\n📍`;
  }

  function getMoviePoster() {
    const posterUrl = movie.medium_cover_image || movie.large_cover_image || movie.small_cover_image;

    if (!posterUrl) {
      return { source: Icon.Video };
    }

    if (posterUrl.includes("yts.mx")) {
      const proxiedUrl = getProxiedImageUrl(posterUrl);
      return { source: proxiedUrl, fallback: getGenreIcon(movie.genres?.[0] || "") };
    }

    return { source: posterUrl };
  }

  function getGenreIcon(genre: string): Icon {
    const genreIcons: { [key: string]: Icon } = {
      action: Icon.Bolt,
      adventure: Icon.Mountain,
      comedy: Icon.SpeechBubble,
      drama: Icon.Mask,
      horror: Icon.Warning,
      thriller: Icon.Exclamationmark,
      "sci-fi": Icon.Rocket,
      fantasy: Icon.Wand,
      romance: Icon.Heart,
      crime: Icon.Shield,
      documentary: Icon.Camera,
      animation: Icon.Pencil,
      family: Icon.Person,
      musical: Icon.Music,
      western: Icon.Star,
    };
    return genreIcons[genre.toLowerCase()] || Icon.Video;
  }

  return (
    <Grid.Item
      content={getMoviePoster()}
      title={movie.title}
      subtitle={subtitle}
      accessory={accessory}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action title="View Details" icon={Icon.Eye} onAction={() => push(<MovieDetails movieId={movie.id} />)} />
            <Action
              title={bestTorrent ? `Copy ${formatQualityWithHDR(bestTorrent)} Magnet` : "Copy Magnet (Unavailable)"}
              icon={Icon.Link}
              onAction={async () => {
                if (!bestTorrent) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "No torrent available",
                    message: "This movie does not have a downloadable torrent yet.",
                  });
                  return;
                }

                const magnetLink = generateMagnetLink(bestTorrent, movie.title, movie.year);
                await Clipboard.copy(magnetLink);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Magnet Link Copied",
                  message: `${movie.title} - ${formatQualityWithHDR(bestTorrent)}`,
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
            <Action
              title="Cycle Sort Options"
              icon={Icon.ArrowClockwise}
              onAction={cycleSortOptions}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
            <Action
              title={bookmarked ? "Remove Bookmark" : "Bookmark Movie"}
              icon={bookmarked ? Icon.Trash : Icon.Bookmark}
              shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
              onAction={async () => {
                try {
                  const nowBookmarked = await toggleBookmark(movie);
                  await showToast({
                    style: Toast.Style.Success,
                    title: nowBookmarked ? "Bookmarked Movie" : "Bookmark Removed",
                    message: movie.title,
                  });
                } catch {
                  // Failure toast handled inside hook; no-op here
                }
              }}
            />
            {hasNewQuality && (
              <Action
                title="Mark Quality Update as Seen"
                icon={Icon.Checkmark}
                onAction={async () => {
                  await acknowledgeQualityUpdate(movie.id);
                }}
              />
            )}
            {showRefreshAction && (
              <Action
                title={isRefreshing ? "Refreshing Bookmarks…" : "Refresh Bookmarked Movies"}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={async () => {
                  if (isRefreshing) {
                    return;
                  }
                  await onRefreshBookmarks?.();
                }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
});
