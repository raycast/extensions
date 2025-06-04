import { LocalStorage } from "@raycast/api";
import { scrobbleTracks } from "./api";
import type { QueuedScrobble, ScrobbleQueueState, ScrobbleResult } from "@/types/ScrobbleQueue";
import type { ScrobbleTrack } from "@/types/ScrobbleResponse";

const STORAGE_KEYS = {
  SCROBBLE_QUEUE: "lastfm_scrobble_queue",
} as const;

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 30000; // 30 seconds base delay

/**
 * Generate a unique ID for a scrobble
 */
function generateScrobbleId(): string {
  return `scrobble_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get the current scrobble queue state
 */
export async function getQueueState(): Promise<ScrobbleQueueState> {
  try {
    const stored = await LocalStorage.getItem(STORAGE_KEYS.SCROBBLE_QUEUE);
    if (typeof stored === "string") {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error reading scrobble queue:", error);
  }

  return {
    queue: [],
    processing: false,
    lastProcessed: undefined,
  };
}

/**
 * Save the scrobble queue state
 */
async function saveQueueState(state: ScrobbleQueueState): Promise<void> {
  try {
    await LocalStorage.setItem(STORAGE_KEYS.SCROBBLE_QUEUE, JSON.stringify(state));
  } catch (error) {
    console.error("Error saving scrobble queue:", error);
  }
}

/**
 * Add a track to the scrobble queue
 */
export async function queueScrobble(track: ScrobbleTrack): Promise<void> {
  const state = await getQueueState();

  const queuedScrobble: QueuedScrobble = {
    id: generateScrobbleId(),
    track: {
      name: track.name,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      mbid: track.mbid,
    },
    timestamp: track.timestamp,
    attempts: 0,
  };

  state.queue.push(queuedScrobble);
  await saveQueueState(state);
}

/**
 * Remove processed scrobbles from the queue
 */
async function removeFromQueue(scrobbleIds: string[]): Promise<void> {
  const state = await getQueueState();
  state.queue = state.queue.filter((scrobble) => !scrobbleIds.includes(scrobble.id));
  await saveQueueState(state);
}

/**
 * Mark failed scrobbles with retry information
 */
async function markFailedScrobbles(failedScrobbles: QueuedScrobble[], error: string): Promise<void> {
  const state = await getQueueState();

  failedScrobbles.forEach((failed) => {
    const queueIndex = state.queue.findIndex((q) => q.id === failed.id);
    if (queueIndex !== -1) {
      state.queue[queueIndex].attempts += 1;
      state.queue[queueIndex].lastAttempt = Date.now();
      state.queue[queueIndex].error = error;
    }
  });

  // Remove scrobbles that have exceeded max retry attempts
  state.queue = state.queue.filter((scrobble) => scrobble.attempts < MAX_RETRY_ATTEMPTS);

  await saveQueueState(state);
}

/**
 * Get scrobbles that are ready for retry
 */
function getRetryableScrobbles(queue: QueuedScrobble[]): QueuedScrobble[] {
  const now = Date.now();
  return queue.filter((scrobble) => {
    if (scrobble.attempts === 0) return true;
    if (scrobble.attempts >= MAX_RETRY_ATTEMPTS) return false;

    // Exponential backoff: 30s, 2min, 8min
    const delay = RETRY_DELAY_BASE * Math.pow(4, scrobble.attempts - 1);
    const timeSinceLastAttempt = now - (scrobble.lastAttempt || 0);

    return timeSinceLastAttempt >= delay;
  });
}

/**
 * Process the scrobble queue
 */
export async function processQueue(): Promise<ScrobbleResult> {
  const state = await getQueueState();

  if (state.processing) {
    return { success: false, error: "Queue is already being processed" };
  }

  if (state.queue.length === 0) {
    return { success: true, accepted: 0, ignored: 0 };
  }

  // Mark as processing
  state.processing = true;
  await saveQueueState(state);

  try {
    const retryableScrobbles = getRetryableScrobbles(state.queue);

    if (retryableScrobbles.length === 0) {
      state.processing = false;
      state.lastProcessed = Date.now();
      await saveQueueState(state);
      return { success: true, accepted: 0, ignored: 0 };
    }

    // Process in batches of 50 (Last.fm limit)
    let totalAccepted = 0;
    let totalIgnored = 0;
    const failedScrobbles: QueuedScrobble[] = [];

    for (let i = 0; i < retryableScrobbles.length; i += 50) {
      const batch = retryableScrobbles.slice(i, i + 50);
      const tracks: ScrobbleTrack[] = batch.map((scrobble) => ({
        name: scrobble.track.name,
        artist: scrobble.track.artist,
        album: scrobble.track.album,
        timestamp: scrobble.timestamp,
        duration: scrobble.track.duration,
        mbid: scrobble.track.mbid,
      }));

      const result = await scrobbleTracks(tracks);

      if (result.success && result.data) {
        totalAccepted += result.data.scrobbles["@attr"].accepted;
        totalIgnored += result.data.scrobbles["@attr"].ignored;

        // Remove successfully processed scrobbles
        const processedIds = batch.map((s) => s.id);
        await removeFromQueue(processedIds);
      } else {
        // Mark this batch as failed
        failedScrobbles.push(...batch);
      }
    }

    // Handle failed scrobbles
    if (failedScrobbles.length > 0) {
      await markFailedScrobbles(failedScrobbles, "Failed to scrobble batch");
    }

    // Update processing state
    state.processing = false;
    state.lastProcessed = Date.now();
    await saveQueueState(state);

    return {
      success: true,
      accepted: totalAccepted,
      ignored: totalIgnored,
      failedScrobbles: failedScrobbles.length > 0 ? failedScrobbles : undefined,
    };
  } catch (error) {
    // Reset processing state on error
    const currentState = await getQueueState();
    currentState.processing = false;
    await saveQueueState(currentState);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Clear the entire scrobble queue
 */
export async function clearQueue(): Promise<void> {
  await saveQueueState({
    queue: [],
    processing: false,
    lastProcessed: Date.now(),
  });
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  total: number;
  pending: number;
  failed: number;
  processing: boolean;
}> {
  const state = await getQueueState();
  const failed = state.queue.filter((s) => s.attempts > 0 && s.attempts < MAX_RETRY_ATTEMPTS).length;

  return {
    total: state.queue.length,
    pending: state.queue.length - failed,
    failed,
    processing: state.processing,
  };
}
