export interface TrackInfo {
  name: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  position: number; // current playback position in seconds
  id?: string; // track identifier (if available)
}

export interface PlayerState {
  isPlaying: boolean;
  playerName: "Music" | "Spotify";
  track: TrackInfo | null;
  timestamp: number; // when this state was captured
}

export type PlayerName = PlayerState["playerName"];

export interface ScrobbleCandidate extends TrackInfo {
  timestamp: number;
  source: PlayerName;
}
