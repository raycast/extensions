import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import crypto from "crypto";
import { getSessionKey } from "../storage";
import type { ScrobbleTrack, ScrobbleResponse, ScrobbleErrorResponse } from "@/types/ScrobbleResponse";
import type { NowPlayingTrack, NowPlayingResponse, NowPlayingErrorResponse } from "@/types/NowPlayingResponse";

const API_ROOT = "https://ws.audioscrobbler.com/2.0/";
const API_FORMAT = "json";

// Get API credentials from preferences
const { apikey: API_KEY, apisecret: API_SECRET } = getPreferenceValues();

/**
 * Generate an MD5 hash of the parameters for API signature
 */
function generateApiSignature(params: Record<string, string>): string {
  // Filter out format and callback parameters
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([key]) => key !== "format" && key !== "callback")
  );

  // Sort parameters alphabetically by key
  const sortedKeys = Object.keys(filteredParams).sort();

  // Build signature string
  let signatureString = sortedKeys.map((key) => `${key}${filteredParams[key]}`).join("");

  // Append secret
  signatureString += API_SECRET;

  // Create md5 hash
  return crypto.createHash("md5").update(signatureString).digest("hex");
}

/**
 * Update the "now playing" track on Last.fm
 */
export async function updateNowPlaying(track: NowPlayingTrack): Promise<{
  success: boolean;
  data?: NowPlayingResponse;
  error?: string;
}> {
  try {
    const sessionKey = await getSessionKey();
    if (!sessionKey) {
      return { success: false, error: "No session key available" };
    }

    const params: Record<string, string> = {
      method: "track.updateNowPlaying",
      api_key: API_KEY,
      sk: sessionKey,
      track: track.name,
      artist: track.artist,
    };

    // Add optional parameters
    if (track.album) params.album = track.album;
    if (track.duration) params.duration = track.duration.toString();
    if (track.mbid) params.mbid = track.mbid;

    // Generate signature
    const api_sig = generateApiSignature(params);

    // Add signature and format
    const fullParams = new URLSearchParams({
      ...params,
      api_sig: api_sig,
      format: API_FORMAT,
    });

    const response = await fetch(API_ROOT, {
      method: "POST",
      body: fullParams,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const data = (await response.json()) as NowPlayingResponse | NowPlayingErrorResponse;

    if ("error" in data) {
      return {
        success: false,
        error: data.message,
      };
    }

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Scrobble one or more tracks to Last.fm
 */
export async function scrobbleTracks(tracks: ScrobbleTrack[]): Promise<{
  success: boolean;
  data?: ScrobbleResponse;
  error?: string;
}> {
  try {
    const sessionKey = await getSessionKey();
    if (!sessionKey) {
      return { success: false, error: "No session key available" };
    }

    if (tracks.length === 0) {
      return { success: false, error: "No tracks to scrobble" };
    }

    // Last.fm supports up to 50 tracks per request
    if (tracks.length > 50) {
      return { success: false, error: "Too many tracks (max 50 per request)" };
    }

    const params: Record<string, string> = {
      method: "track.scrobble",
      api_key: API_KEY,
      sk: sessionKey,
    };

    // Add track parameters
    tracks.forEach((track, index) => {
      const suffix = tracks.length === 1 ? "" : `[${index}]`;
      params[`track${suffix}`] = track.name;
      params[`artist${suffix}`] = track.artist;
      params[`timestamp${suffix}`] = track.timestamp.toString(); // Timestamp should already be in seconds

      // Add optional parameters
      if (track.album) params[`album${suffix}`] = track.album;
      if (track.duration) params[`duration${suffix}`] = track.duration.toString();
      if (track.mbid) params[`mbid${suffix}`] = track.mbid;
    });

    // Generate signature
    const api_sig = generateApiSignature(params);

    // Add signature and format
    const fullParams = new URLSearchParams({
      ...params,
      api_sig: api_sig,
      format: API_FORMAT,
    });

    const response = await fetch(API_ROOT, {
      method: "POST",
      body: fullParams,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const data = (await response.json()) as ScrobbleResponse | ScrobbleErrorResponse;

    if ("error" in data) {
      return {
        success: false,
        error: data.message,
      };
    }

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
