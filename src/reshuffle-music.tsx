import { showToast, Toast } from "@raycast/api";
import { createClient } from "@supabase/supabase-js";
import { spawn } from "child_process";
import fetch from "node-fetch";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

interface MusicTrack {
  name: string;
  url: string;
  size: number;
  path: string;
}

export default async function Command() {
  try {
    // First stop any currently playing music
    spawn("pkill", ["-f", "afplay"]);

    showToast({
      style: Toast.Style.Animated,
      title: "🔀 Reshuffling...",
      message: "Loading new random track",
    });

    // Supabase configuration
    const SUPABASE_URL = "https://fbrrpowisxjwnrsgvuek.supabase.co";
    const SUPABASE_ANON_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZicnJwb3dpc3hqd25yc2d2dWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3ODAzNTMsImV4cCI6MjA2MDM1NjM1M30.JVTbW6u6BlDG0FGkU-8XrI6xXjvOosWrxxurJKcD7tI";

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get random track from Supabase
    const { data: files, error } = await supabase.storage
      .from("music_tracks")
      .list();

    if (error) throw error;

    if (files && files.length > 0) {
      const musicFiles = files
        .filter((file) => file.name.match(/\.(mp3|wav|m4a|aac|flac)$/i))
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
        throw new Error("No music files found");
      }

      // Pick random track
      const randomIndex = Math.floor(Math.random() * musicFiles.length);
      const track = musicFiles[randomIndex];

      showToast({
        style: Toast.Style.Animated,
        title: "🔄 Buffering...",
        message: `Loading ${track.name}`,
      });

      // Download and play the track
      const response = await fetch(track.url);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save to temp file
      const tempFileName = `looma_reshuffle_${Date.now()}.mp3`;
      const tempFilePath = join(tmpdir(), tempFileName);
      writeFileSync(tempFilePath, buffer);

      // Play the audio file using macOS afplay
      const audioProcess = spawn("afplay", [tempFilePath]);

      audioProcess.on("close", (code) => {
        // Clean up temp file when done
        if (existsSync(tempFilePath)) {
          try {
            unlinkSync(tempFilePath);
          } catch (e) {
            console.log("Could not delete temp file:", e);
          }
        }
      });

      audioProcess.on("error", (err) => {
        console.error("Playback error:", err);
        showToast({
          style: Toast.Style.Failure,
          title: "Playback Error",
          message: `Cannot play ${track.name}`,
        });
      });

      showToast({
        style: Toast.Style.Success,
        title: "♪ Now Playing",
        message: track.name,
      });
    } else {
      throw new Error("No tracks found in music library");
    }
  } catch (error) {
    console.error("Reshuffle error:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Reshuffle Error",
      message: `Cannot reshuffle: ${error.message || "Unknown error"}`,
    });
  }
}
