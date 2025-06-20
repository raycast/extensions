import React, { useState, useEffect } from "react";
import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";
import { TrackObject } from "./helpers/spotify.api";
import { searchGeniusLyrics } from "./api/geniusLyrics";

// Component to show lyrics for the currently playing song
export default function FindLyricsCommand() {
  const [lyrics, setLyrics] = useState<string>("");
  const [songInfo, setSongInfo] = useState<{ title: string; artist: string; album?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchLyrics = async () => {
      try {
        setIsLoading(true);
        setError("");

        // Set up Spotify client
        await setSpotifyClient();

        // Get currently playing track
        const currentlyPlayingData = await getCurrentlyPlaying();

        if (!currentlyPlayingData || !currentlyPlayingData.item) {
          setError("Nothing is currently playing on Spotify");
          return;
        }

        const { item } = currentlyPlayingData;
        const isTrack = currentlyPlayingData.currently_playing_type !== "episode";

        if (!isTrack) {
          setError("Lyrics are only available for music tracks, not podcasts or episodes");
          return;
        }

        const track = item as TrackObject;
        const songTitle = track.name;
        const artistName = track.artists?.[0]?.name;

        if (!songTitle || !artistName) {
          setError("Could not get song information from the currently playing track");
          return;
        }

        // Set song info
        setSongInfo({
          title: songTitle,
          artist: artistName,
          album: track.album?.name
        });

        // Search for lyrics using our Genius API
        const result = await searchGeniusLyrics(songTitle, artistName);

        if (result.lyrics && result.lyrics.trim() !== "") {
          setLyrics(result.lyrics);
        } else {
          setError("Lyrics not found on Genius for this song");
        }
      } catch (err: any) {
        console.error("Error fetching lyrics:", err);
        setError(err.message || "Failed to fetch lyrics. Please try again.");
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: err.message || "Failed to fetch lyrics",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLyrics();
  }, []);

  const markdown = () => {
    if (error) {
      return `# Error\n\n${error}\n\n## Tips:\n- Try searching for a different version of the song\n- Check if the song is available on Genius\n- Some songs may not have lyrics available`;
    }

    if (!lyrics) {
      return `# Loading lyrics for "${songInfo?.title || 'current song'}"\n\nPlease wait while we fetch the lyrics...`;
    }

    return `# ${songInfo?.title}\n\n**Artist:** ${songInfo?.artist}\n\n${songInfo?.album ? `**Album:** ${songInfo.album}\n\n` : ''}---\n\n${lyrics.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0).join('\n\n')}`;
  };

  const actions = [];

  if (lyrics) {
    actions.push(
      React.createElement(Action.CopyToClipboard, {
        title: "Copy Lyrics",
        content: lyrics,
        shortcut: { modifiers: ["cmd"], key: "c" },
      }),
      React.createElement(Action.CopyToClipboard, {
        title: "Copy Song Info",
        content: `${songInfo?.title} by ${songInfo?.artist}`,
        shortcut: { modifiers: ["cmd", "shift"], key: "c" },
      })
    );
  }

  return React.createElement(
    Detail,
    {
      isLoading: isLoading,
      markdown: markdown(),
      navigationTitle: songInfo ? `${songInfo.title} - ${songInfo.artist}` : "Find Lyrics",
      actions: React.createElement(ActionPanel, {}, ...actions),
    }
  );
} 