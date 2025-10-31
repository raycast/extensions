import { useState, useEffect } from "react";
import { Detail, ActionPanel, Action, Icon, showToast, Toast, Clipboard, useNavigation } from "@raycast/api";
import { getMovieDetails } from "./api";
import { Movie } from "./types";
import {
  generateMagnetLink,
  getYTSUrl,
  getIMDbUrl,
  getRottenTomatoesSearchUrl,
  getPlexSearchUrl,
  formatRuntime,
  getProxiedImageUrl,
  getLanguageName,
  getQualityColor,
  formatQualityWithHDR,
  filterAndSortTorrents,
} from "./utils";
import { useBookmarks } from "./hooks";
import { fetchOverviewByIMDbId } from "./tmdb-api";
import { getSynopsisWithFallback } from "./synopsis-cache";

interface MovieDetailsProps {
  movieId: number;
}

export function MovieDetails({ movieId }: MovieDetailsProps) {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tmdbSynopsis, setTmdbSynopsis] = useState<string | null>(null);
  const { pop } = useNavigation();
  const { isBookmarked, toggleBookmark, bookmarkMap, acknowledgeQualityUpdate } = useBookmarks();

  useEffect(() => {
    async function fetchDetails() {
      try {
        const response = await getMovieDetails(movieId);
        const movieData = response.data.movie;

        // Validate that we have at least basic movie data
        if (!movieData || (!movieData.title && !movieData.title_english && !movieData.title_long)) {
          throw new Error("Invalid movie data received");
        }

        setMovie(movieData);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load movie details",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        pop();
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetails();
  }, [movieId, pop]);

  // Fetch TMDB synopsis if YTS data is missing
  useEffect(() => {
    async function fetchTMDBSynopsis() {
      if (!movie) return;

      // Check if YTS has any synopsis data
      const hasSynopsis =
        (movie.synopsis && movie.synopsis.trim().length > 0) ||
        (movie.description_full && movie.description_full.trim().length > 0) ||
        (movie.summary && movie.summary.trim().length > 0);

      // If YTS has synopsis, don't fetch from TMDB
      if (hasSynopsis) {
        return;
      }

      // If no IMDB code, can't lookup on TMDB
      if (!movie.imdb_code) {
        return;
      }

      // Fetch from cache or TMDB
      const overview = await getSynopsisWithFallback(movie.imdb_code, () => fetchOverviewByIMDbId(movie.imdb_code));

      if (overview) {
        setTmdbSynopsis(overview);
      }
    }

    fetchTMDBSynopsis();
  }, [movie]);

  if (isLoading || !movie) {
    return <Detail isLoading={true} />;
  }

  const filteredTorrents = filterAndSortTorrents(movie.torrents || []);

  // Check if we have meaningful movie data
  const hasBasicInfo = movie.title || movie.title_english || movie.title_long;
  const hasTorrents = filteredTorrents && filteredTorrents.length > 0;
  const hasValidRating = movie.rating && movie.rating > 0;
  const validGenres = movie.genres ? movie.genres.filter((genre) => genre && genre.trim().length > 0) : [];
  const hasGenres = validGenres.length > 0;
  const hasRuntime = movie.runtime && movie.runtime > 0;
  const hasLanguage = movie.language && movie.language.trim().length > 0;

  // If we don't have basic info, show a more helpful message
  if (!hasBasicInfo) {
    return (
      <Detail
        markdown="# Movie Details Not Available\n\n⚠️ This movie's details haven't been fully loaded yet or may not be available.\n\nPlease try again later or search for a different movie."
        actions={
          <ActionPanel>
            <Action title="Go Back" onAction={pop} icon={Icon.ArrowLeft} />
          </ActionPanel>
        }
      />
    );
  }

  const posterUrl = movie.medium_cover_image || movie.large_cover_image || movie.small_cover_image;
  const proxiedPosterUrl = posterUrl ? getProxiedImageUrl(posterUrl) : "";

  // Check if we have any meaningful content beyond just the title
  // Always show content if we have any of these, let individual sections handle their own validation
  const hasAnyContent = true; // Let sections show/hide themselves based on their own content

  // Smart title formatting to avoid duplicate years
  const getFormattedTitle = () => {
    const title = movie.title_long || movie.title || movie.title_english || "Unknown Movie";
    const year = movie.year && movie.year > 0 ? movie.year : null;

    // Check if the title already contains the year
    if (year && title.includes(`(${year})`)) {
      return title; // Title already has the year
    }

    // If we have a title_long, use it as-is (it usually includes the year)
    if (movie.title_long) {
      return movie.title_long;
    }

    // Otherwise, add the year if available
    return year ? `${title} (${year})` : title;
  };

  // Build markdown content conditionally
  let markdown = `# ${getFormattedTitle()}\n\n`;

  if (proxiedPosterUrl) {
    markdown += `![${movie.title || "Movie poster"}](${proxiedPosterUrl})\n\n`;
  }

  if (!hasAnyContent) {
    markdown += `⚠️ **Movie details not yet available**\n\nThis movie was found but detailed information hasn't been loaded yet. Please try again later or search for a different movie.\n\n`;
  } else {
    // Try to show synopsis from YTS or TMDB fallback
    const synopsis = movie.synopsis || movie.description_full || movie.summary || tmdbSynopsis;
    if (synopsis && synopsis.trim().length > 0) {
      markdown += `## Synopsis\n${synopsis.trim()}\n\n`;
    }

    if (hasTorrents) {
      markdown += `## Available Torrents\n${filteredTorrents
        .map(
          (t) => `> **${formatQualityWithHDR(t)}**  
> ${t.size} · Seeds: ${t.seeds} · Peers: ${t.peers}  
> Codec: ${t.video_codec || "N/A"} · Uploaded: ${new Date(t.date_uploaded).toLocaleDateString()}  
`,
        )
        .join("\n")}\n`;
    } else {
      // Check if we showed a synopsis above
      const synopsis = movie.synopsis || movie.description_full || movie.summary;
      const hasShownSynopsis = synopsis && synopsis.trim().length > 0;

      if (!hasShownSynopsis) {
        // Only show the "no downloads" message if we also have no synopsis to show
        markdown += `## Downloads\n\n⚠️ **No download links available yet**\n\nThis movie may be newly added or temporarily unavailable. Try checking back later.\n\n`;
      }
    }
  }

  // Build metadata object conditionally
  const metadataProps: { metadata?: React.JSX.Element } = {};
  const bookmarked = isBookmarked(movie.id);
  const bookmarkMeta = bookmarkMap[movie.id];
  const hasNewQuality = Boolean(bookmarkMeta?.hasNewQuality);

  // Only add metadata if we have meaningful data
  if (hasValidRating || hasRuntime || hasGenres || hasLanguage || hasTorrents || bookmarked) {
    const metadataItems = [];

    if (hasNewQuality) {
      metadataItems.push(
        <Detail.Metadata.Label
          key="new-quality"
          title="Quality Update"
          text="✨ New Quality Available"
          icon={Icon.StarCircle}
        />,
      );
    }

    if (hasValidRating) {
      metadataItems.push(
        <Detail.Metadata.Label key="rating" title="Rating" text={`${movie.rating}/10`} icon={Icon.Star} />,
      );
    }

    if (hasRuntime) {
      metadataItems.push(
        <Detail.Metadata.Label key="runtime" title="Runtime" text={formatRuntime(movie.runtime)} icon={Icon.Clock} />,
      );
    }

    if (hasGenres) {
      metadataItems.push(
        <Detail.Metadata.TagList key="genres" title="Genres">
          {validGenres.map((genre, index) => (
            <Detail.Metadata.TagList.Item key={`genre-${index}`} text={genre.trim()} />
          ))}
        </Detail.Metadata.TagList>,
      );
    }

    if (hasLanguage) {
      metadataItems.push(
        <Detail.Metadata.Label
          key="language"
          title="Language"
          text={getLanguageName(movie.language)}
          icon={Icon.Globe}
        />,
      );
    }

    if (hasTorrents) {
      metadataItems.push(
        <Detail.Metadata.TagList key="qualities" title="Available Qualities">
          {[...new Set(filteredTorrents.map(formatQualityWithHDR))].map((qualityType) => {
            const quality = qualityType.split(" ")[0]; // Extract just the quality part for color
            return (
              <Detail.Metadata.TagList.Item
                key={`quality-${qualityType}`}
                text={qualityType}
                color={getQualityColor(quality)}
              />
            );
          })}
        </Detail.Metadata.TagList>,
      );
    }

    // Only add metadata if we actually have items to show
    if (metadataItems.length > 0) {
      metadataProps.metadata = <Detail.Metadata>{metadataItems}</Detail.Metadata>;
    }
  }

  const bestTorrent = filteredTorrents[0];

  const detailTitle = bookmarked ? `📍 ${getFormattedTitle()}` : getFormattedTitle();

  return (
    <Detail
      markdown={`# ${detailTitle}\n\n${markdown.split("\n\n").slice(1).join("\n\n")}`}
      navigationTitle={movie.title}
      {...metadataProps}
      actions={
        <ActionPanel>
          {bestTorrent && (
            <Action
              title={`Copy ${formatQualityWithHDR(bestTorrent)} Magnet`}
              icon={Icon.Link}
              onAction={async () => {
                const magnetLink = generateMagnetLink(bestTorrent, movie.title, movie.year);
                await Clipboard.copy(magnetLink);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Magnet Link Copied",
                  message: `${movie.title} - ${formatQualityWithHDR(bestTorrent)}`,
                });
              }}
            />
          )}
          <ActionPanel.Section title="Bookmarks">
            {hasNewQuality && (
              <Action
                title="Mark Quality Update as Seen"
                icon={Icon.Checkmark}
                onAction={async () => {
                  await acknowledgeQualityUpdate(movie.id);
                }}
              />
            )}
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
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy Magnet Links">
            {filteredTorrents?.map((torrent) => {
              const magnetLink = generateMagnetLink(torrent, movie.title, movie.year);
              const torrentDescription = formatQualityWithHDR(torrent);
              return (
                <Action
                  key={`${torrent.hash}-${torrent.quality}`}
                  title={`Copy ${torrentDescription} Magnet`}
                  icon={Icon.Link}
                  onAction={async () => {
                    await Clipboard.copy(magnetLink);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Magnet Link Copied",
                      message: `${movie.title} - ${torrentDescription}`,
                    });
                  }}
                />
              );
            })}
          </ActionPanel.Section>

          <ActionPanel.Section title="External Links">
            {(movie.title || movie.title_english) && (
              <Action.OpenInBrowser
                title="Open on YTS"
                url={getYTSUrl(movie)}
                icon={Icon.Globe}
                shortcut={{ modifiers: ["cmd"], key: "y" }}
              />
            )}

            {movie.imdb_code && (
              <Action.OpenInBrowser
                title="Open on IMDb"
                url={getIMDbUrl(movie.imdb_code)}
                icon={Icon.Star}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />
            )}

            <Action.OpenInBrowser
              title="Search on Rotten Tomatoes"
              url={getRottenTomatoesSearchUrl(movie.title)}
              icon={Icon.Binoculars}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />

            <Action.OpenInBrowser
              title="Search on Plex"
              url={getPlexSearchUrl(movie.title || movie.title_english || "Unknown")}
              icon={Icon.Monitor}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />

            {movie.yt_trailer_code && (
              <Action.OpenInBrowser
                title="Watch Trailer on YouTube"
                url={`https://www.youtube.com/watch?v=${movie.yt_trailer_code}`}
                icon={Icon.Video}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
