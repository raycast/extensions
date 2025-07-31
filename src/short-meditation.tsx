import { showToast, Toast } from "@raycast/api";
import { createClient } from "@supabase/supabase-js";
import { spawn } from "child_process";
import fetch from "node-fetch";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

interface MeditationTrack {
  name: string;
  url: string;
  size: number;
  path: string;
}

export default async function Command() {
  try {
    // First stop any currently playing music/meditation
    spawn("pkill", ["-f", "afplay"]);

    showToast({
      style: Toast.Style.Animated,
      title: "🧘‍♀️ Preparing...",
      message: "Loading meditation session",
    });

    // Supabase configuration
    const SUPABASE_URL = "https://fbrrpowisxjwnrsgvuek.supabase.co";
    const SUPABASE_ANON_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZicnJwb3dpc3hqd25yc2d2dWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3ODAzNTMsImV4cCI6MjA2MDM1NjM1M30.JVTbW6u6BlDG0FGkU-8XrI6xXjvOosWrxxurJKcD7tI";

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get meditation tracks from separate meditation bucket
    const { data: files, error } = await supabase.storage
      .from("meditation")
      .list();

    if (error) {
      throw new Error(`Cannot access tracks: ${error.message}`);
    }

    if (files && files.length > 0) {
      // Filter for audio files in meditation bucket
      const meditationFiles = files
        .filter((file) => file.name.match(/\.(mp3|wav|m4a|aac|flac)$/i))
        .map((file): MeditationTrack => {
          const { data } = supabase.storage
            .from("meditation")
            .getPublicUrl(file.name);

          return {
            name: file.name.replace(/\.[^/.]+$/, ""),
            url: data.publicUrl,
            size: file.metadata?.size || 0,
            path: file.name,
          };
        });

      if (meditationFiles.length === 0) {
        throw new Error(
          `No meditation files found. Please create a 'meditation' bucket and upload audio files there.`,
        );
      }

      // Pick random meditation track
      const randomIndex = Math.floor(Math.random() * meditationFiles.length);
      const track = meditationFiles[randomIndex];

      showToast({
        style: Toast.Style.Animated,
        title: "🔄 Loading...",
        message: `Preparing "${track.name}"`,
      });

      // Download the meditation track
      const response = await fetch(track.url);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save to temp file
      const tempFileName = `meditation_${Date.now()}.mp3`;
      const tempFilePath = join(tmpdir(), tempFileName);
      writeFileSync(tempFilePath, buffer);

      // Play the meditation session using macOS afplay
      const audioProcess = spawn("afplay", [tempFilePath]);

      audioProcess.on("close", (code) => {
        // Clean up temp file when meditation session ends
        if (existsSync(tempFilePath)) {
          try {
            unlinkSync(tempFilePath);
          } catch (e) {
            // Ignore cleanup errors
          }
        }

        if (code === 0) {
          // Meditation session completed successfully
          showToast({
            style: Toast.Style.Success,
            title: "🧘‍♀️ Session Complete",
            message: "Meditation session finished. Take a moment to breathe.",
          });
        }
      });

      audioProcess.on("error", (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Playback Error",
          message: `Cannot play meditation: ${track.name}`,
        });
      });

      showToast({
        style: Toast.Style.Success,
        title: "🧘‍♀️ Meditation Started",
        message: `"${track.name}" • Single session`,
      });
    } else {
      throw new Error(
        "Meditation bucket is empty. Please upload meditation audio files to your 'meditation' bucket.",
      );
    }
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Meditation Error",
      message: `Cannot start session: ${error.message || "Unknown error"}`,
    });
  }
}
