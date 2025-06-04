// API functions
export { updateNowPlaying, scrobbleTracks } from "./api";

// Queue management
export { queueScrobble, processQueue, clearQueue, getQueueState, getQueueStats } from "./queue";

// Re-export types for convenience
export type { ScrobbleTrack, ScrobbleResponse } from "@/types/ScrobbleResponse";
export type { NowPlayingTrack, NowPlayingResponse } from "@/types/NowPlayingResponse";
export type { QueuedScrobble, ScrobbleQueueState, ScrobbleResult } from "@/types/ScrobbleQueue";
