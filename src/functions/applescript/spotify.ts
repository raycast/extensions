import { runAppleScript } from "run-applescript";
import type { PlayerState, TrackInfo } from "./types";

const GET_TRACK_INFO_SCRIPT = `
if application "Spotify" is not running then
  return "not running"
end if

tell application "Spotify"
  if player state is playing then
    set tName to name of current track
    set tArtist to artist of current track
    set tAlbum to album of current track
    
    -- Get duration in milliseconds and convert to seconds
    try
      set tDuration to (duration of current track) / 1000
    on error
      set tDuration to 0
    end try
    
    -- Get position in seconds
    try
      set tPosition to player position
    on error
      set tPosition to 0
    end try
    
    set tId to id of current track
    
    return "playing" & tab & tName & tab & tArtist & tab & tAlbum & tab & tDuration & tab & tPosition & tab & tId
  else
    return "paused"
  end if
end tell
`;

/**
 * Parse a number that may use comma as decimal separator
 */
function parseDecimalNumber(value: string): number {
  if (!value) return 0;
  // Replace comma with period for proper JavaScript parsing
  const normalizedValue = value.replace(",", ".");
  const parsed = Number(normalizedValue);
  return isNaN(parsed) ? 0 : parsed;
}

export async function getSpotifyState(): Promise<PlayerState> {
  try {
    const result = await runAppleScript(GET_TRACK_INFO_SCRIPT);
    console.log("Spotify raw result:", result); // Debug log
    const parts = result.split("\t");

    const baseState: PlayerState = {
      isPlaying: false,
      playerName: "Spotify",
      track: null,
      timestamp: Date.now(),
    };

    if (parts[0] === "not running" || parts[0] === "paused") {
      return baseState;
    }

    if (parts[0] === "playing" && parts.length >= 7) {
      const track: TrackInfo = {
        name: parts[1] || "",
        artist: parts[2] || "",
        album: parts[3] || "",
        duration: Math.round(parseDecimalNumber(parts[4])),
        position: Math.round(parseDecimalNumber(parts[5])),
        id: parts[6] || "",
      };

      console.log("Spotify parsed track:", track); // Debug log

      return {
        ...baseState,
        isPlaying: true,
        track,
      };
    }

    return baseState;
  } catch (error) {
    console.error("Error getting Spotify state:", error);
    return {
      isPlaying: false,
      playerName: "Spotify",
      track: null,
      timestamp: Date.now(),
    };
  }
}
