import React, { useState, useEffect, useRef } from "react";
import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Clipboard,
} from "@raycast/api";
import { createClient } from "@supabase/supabase-js";
import { spawn, ChildProcess } from "child_process";
import fetch from "node-fetch";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  savePlaybackState,
  loadPlaybackState,
  clearPlaybackState,
} from "./shared-state";

interface MusicTrack {
  name: string;
  url: string;
  size: number;
  path: string;
}

export default function ShuffleMusic(): JSX.Element {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const audioProcessRef = useRef<ChildProcess | null>(null);
  const currentFileRef = useRef<string | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMusicTracks();

    // Check if there's a paused track to resume
    const savedState = loadPlaybackState();
    if (savedState && savedState.currentTrack) {
      const trackWithSize: MusicTrack = {
        ...savedState.currentTrack,
        size: 0, // Default size for resumed tracks
      };
      setCurrentTrack(trackWithSize);
      setIsPlaying(savedState.isPlaying);

      // If pause command cleared isPaused flag, resume playback
      if (!savedState.isPaused && !savedState.isPlaying) {
        setTimeout(() => {
          downloadAndPlayTrack(trackWithSize);
        }, 1000);
      }
    }
  }, []);

  useEffect(() => {
    // Auto-select and stream a random track when tracks are loaded
    if (tracks.length > 0 && !currentTrack) {
      playRandomTrack();
    }
  }, [tracks]);

  useEffect(() => {
    // Also auto-start if we have tracks but no current track (fallback)
    if (tracks.length > 0 && !currentTrack && !loading) {
      setTimeout(() => playRandomTrack(), 500);
    }
  }, [tracks, currentTrack, loading]);

  const loadMusicTracks = async () => {
    try {
      setLoading(true);

      showToast({
        style: Toast.Style.Animated,
        title: "Loading",
        message: "Connecting to Supabase...",
      });

      // Supabase configuration
      const SUPABASE_URL = "https://fbrrpowisxjwnrsgvuek.supabase.co";
      const SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZicnJwb3dpc3hqd25yc2d2dWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3ODAzNTMsImV4cCI6MjA2MDM1NjM1M30.JVTbW6u6BlDG0FGkU-8XrI6xXjvOosWrxxurJKcD7tI";

      // No fallback - always try Supabase

      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // List files from your Supabase storage bucket
      const { data: files, error } = await supabase.storage
        .from("music_tracks") // Your public bucket name (plural)
        .list();

      if (error) {
        throw error;
      }

      if (files && files.length > 0) {
        const musicFiles = files
          .filter((file) => {
            const isMusic = file.name.match(/\.(mp3|wav|m4a|aac|flac)$/i);
            return isMusic;
          })
          .map((file): MusicTrack => {
            const { data } = supabase.storage
              .from("music_tracks")
              .getPublicUrl(file.name);

            return {
              name: file.name.replace(/\.[^/.]+$/, ""),
              url: data.publicUrl,
              size: file.metadata?.size || 0,
              path: file.name,
            };
          });

        if (musicFiles.length === 0) {
          throw new Error(
            `No music files found in bucket. Found ${files.length} files but none are music formats (mp3, wav, m4a, aac, flac)`,
          );
        }

        const shuffledTracks = shuffleArray(musicFiles);
        setTracks(shuffledTracks);

        showToast({
          style: Toast.Style.Success,
          title: "Looma.FM Ready",
          message: `${shuffledTracks.length} tracks loaded • Starting stream...`,
        });
      } else {
        throw new Error(
          "No files found in Supabase bucket 'music_tracks'. Please upload your music files to the bucket.",
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      const errorName = error instanceof Error ? error.name : "Error";

      showToast({
        style: Toast.Style.Failure,
        title: errorName,
        message: errorMessage,
      });

      // Don't set any tracks - leave empty to show error state
      setTracks([]);
      setCurrentTrack(null);
    } finally {
      setLoading(false);
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const downloadAndPlayTrack = async (track: MusicTrack) => {
    try {
      setCurrentTrack(track);
      setIsBuffering(true);
      setDownloadProgress(0);

      showToast({
        style: Toast.Style.Animated,
        title: "♪ Buffering...",
        message: `Loading ${track.name}`,
      });

      // Stop current audio if playing
      if (audioProcessRef.current) {
        audioProcessRef.current.kill();
        audioProcessRef.current = null;
      }

      // Clean up previous temp file
      if (currentFileRef.current && existsSync(currentFileRef.current)) {
        try {
          unlinkSync(currentFileRef.current);
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      // Download audio file
      const response = await fetch(track.url);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const buffer = await response.buffer();

      // Save to temp file
      const tempFileName = `looma_${Date.now()}.mp3`;
      const tempFilePath = join(tmpdir(), tempFileName);
      writeFileSync(tempFilePath, buffer);
      currentFileRef.current = tempFilePath;

      setIsBuffering(false);
      setDownloadProgress(100);

      // Play the audio file using macOS afplay
      const audioProcess = spawn("afplay", [tempFilePath]);

      audioProcess.on("close", (code) => {
        setIsPlaying(false);
        if (code === 0) {
          // Track finished playing successfully, auto-play next
          setTimeout(() => playRandomTrack(), 500);
        }
      });

      audioProcess.on("error", (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Playback Error",
          message: `Cannot play ${track.name}`,
        });
        setIsPlaying(false);
      });

      audioProcessRef.current = audioProcess;
      setIsPlaying(true);

      // Save current playback state
      savePlaybackState({
        currentTrack: track,
        isPlaying: true,
        isPaused: false,
        tempFilePath,
      });

      // Start progress tracking
      startProgressTracking();

      showToast({
        style: Toast.Style.Success,
        title: "♪ Now Playing",
        message: track.name,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Stream Error",
        message: `Cannot stream: ${error.message || "Unknown error"}`,
      });
      setIsBuffering(false);
      setIsPlaying(false);
    }
  };

  const pausePlayback = () => {
    if (audioProcessRef.current && isPlaying) {
      audioProcessRef.current.kill();
      audioProcessRef.current = null;
      setIsPlaying(false);
      stopProgressTracking();

      // Save paused state
      if (currentTrack) {
        savePlaybackState({
          currentTrack,
          isPlaying: false,
          isPaused: true,
          tempFilePath: currentFileRef.current || undefined,
        });
      }

      showToast({
        style: Toast.Style.Success,
        title: "⏸ Paused",
        message: "Track paused",
      });
    } else if (currentTrack && !isPlaying) {
      // Resume playback
      downloadAndPlayTrack(currentTrack);
    }
  };

  const stopPlayback = () => {
    if (audioProcessRef.current) {
      audioProcessRef.current.kill();
      audioProcessRef.current = null;
    }

    stopProgressTracking();
    setIsPlaying(false);
    setCurrentTime(0);

    // Clear saved state
    clearPlaybackState();

    showToast({
      style: Toast.Style.Success,
      title: "⏹ Stopped",
      message: "Ready for next track",
    });
  };

  const startProgressTracking = () => {
    // Simulate progress tracking (since play-sound doesn't provide real-time progress)
    const startTime = Date.now();
    const estimatedDuration = 180; // 3 minutes average
    setDuration(estimatedDuration);

    progressIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setCurrentTime(Math.min(elapsed, estimatedDuration));
    }, 1000);
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const playRandomTrack = () => {
    if (tracks.length > 0) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      const randomTrack = tracks[randomIndex];
      downloadAndPlayTrack(randomTrack);
    }
  };

  const shuffleTracks = () => {
    const shuffled = shuffleArray(tracks);
    setTracks(shuffled);
    showToast({
      style: Toast.Style.Success,
      title: "Reshuffled",
      message: "Track order randomized",
    });
  };

  const getStreamStatus = () => {
    if (isBuffering) return "🔄 Buffering...";
    if (isPlaying) return "♪ Now Playing";
    if (currentTrack) return "⏸ Ready";
    return "🎵 Loading...";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getProgressPercentage = () => {
    if (duration === 0) return 0;
    return Math.min((currentTime / duration) * 100, 100);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioProcessRef.current) {
        audioProcessRef.current.kill();
      }
      stopProgressTracking();
      if (currentFileRef.current && existsSync(currentFileRef.current)) {
        try {
          unlinkSync(currentFileRef.current);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  return (
    // @ts-ignore
    <List
      isLoading={loading}
      navigationTitle="🎵 Looma.FM - Adi Goldstein Music"
      searchBarPlaceholder="Ambient music streaming from Adi Goldstein..."
    >
      {currentTrack ? (
        {/* @ts-ignore */}
        <List.Section title={getStreamStatus()}>
          {/* @ts-ignore */}
          <List.Item
            title={currentTrack.name}
            subtitle={`Adi Goldstein • ${formatTime(currentTime)} / ${formatTime(duration)} • ${isBuffering ? `Buffering ${downloadProgress}%` : isPlaying ? "Streaming" : "Ready"}`}
            icon={
              isBuffering
                ? Icon.CircleProgress
                : isPlaying
                  ? Icon.Music
                  : Icon.Play
            }
            accessories={[
              { text: `${Math.round(getProgressPercentage())}%` },
              { text: `${tracks.length} tracks` },
            ]}
            actions={
              {/* @ts-ignore */}
              <ActionPanel>
                {/* @ts-ignore */}
                <Action
                  title={isPlaying ? "Pause" : "Play Track"}
                  icon={isPlaying ? Icon.Pause : Icon.Play}
                  onAction={() =>
                    isPlaying
                      ? pausePlayback()
                      : downloadAndPlayTrack(currentTrack)
                  }
                  shortcut={{ modifiers: ["cmd"], key: "space" }}
                />
                {/* @ts-ignore */}
                <Action
                  title="Next Random Track"
                  icon={Icon.Forward}
                  onAction={playRandomTrack}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                {/* @ts-ignore */}
                <Action
                  title="Stop Playback"
                  icon={Icon.Stop}
                  onAction={stopPlayback}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
                {/* @ts-ignore */}
                <Action
                  title="Reshuffle All Tracks"
                  icon={Icon.Shuffle}
                  onAction={shuffleTracks}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
                {/* @ts-ignore */}
                <Action
                  title="Copy Stream URL"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    await Clipboard.copy(currentTrack.url);
                    showToast({
                      style: Toast.Style.Success,
                      title: "Copied",
                      message: "Track URL copied to clipboard",
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : tracks.length > 0 ? (
        {/* @ts-ignore */}
        <List.Section title="🎶 Starting Stream...">
          {/* @ts-ignore */}
          <List.Item
            title="Looma.FM Radio"
            subtitle="Auto-selecting a random track for streaming..."
            icon={Icon.CircleProgress}
            accessories={[{ text: `${tracks.length} tracks ready` }]}
          />
        </List.Section>
      ) : (
        !loading && (
          {/* @ts-ignore */}
          <List.EmptyView
            title="No Music Library Found"
            description="Upload music files to your Supabase 'music_tracks' bucket to start streaming."
            icon={Icon.ExclamationMark}
          />
        )
      )}
    </List>
  );
}
