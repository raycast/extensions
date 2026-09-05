import { fetchTranscript, type TranscriptResult, type TranscriptSegment } from "youtube-transcript-plus";

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"]);

type TranscriptFetcher = (
  videoId: string,
  options: { videoDetails: true; retries: number; retryDelay: number; signal?: AbortSignal },
) => Promise<TranscriptResult>;

const defaultTranscriptFetcher: TranscriptFetcher = (videoId, options) => fetchTranscript(videoId, options);

export type VideoTranscript = {
  title: string;
  segments: TranscriptSegment[];
};

export type TranscriptFormat = "text" | "markdown" | "vtt";

export type TranscriptOutput = {
  content: string;
  extension: "txt" | "md" | "vtt";
};

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
  };

  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (entity, code: string) => {
    if (!code.startsWith("#")) return namedEntities[code.toLowerCase()] ?? entity;

    const isHex = code[1]?.toLowerCase() === "x";
    const codePoint = Number.parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
    return Number.isSafeInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : entity;
  });
}

export function getYouTubeVideoId(input: string): string | null {
  const value = input.trim();

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && VIDEO_ID_PATTERN.test(id) ? id : null;
    }

    if (!YOUTUBE_HOSTS.has(host)) return null;

    const pathParts = url.pathname.split("/").filter(Boolean);
    const id = url.pathname === "/watch" ? url.searchParams.get("v") : pathParts[1];
    const supportedPath = url.pathname === "/watch" || ["shorts", "live", "embed"].includes(pathParts[0] ?? "");

    return supportedPath && id && VIDEO_ID_PATTERN.test(id) ? id : null;
  } catch {
    return null;
  }
}

function cleanSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  return segments
    .map((segment) => ({
      ...segment,
      text: decodeHtmlEntities(segment.text).replace(/\s+/g, " ").trim(),
    }))
    .filter((segment) => segment.text.length > 0);
}

function subtitleTimestamp(seconds: number, separator: "," | "."): string {
  const milliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const remainingSeconds = Math.floor((milliseconds % 60_000) / 1000);
  const remainingMilliseconds = milliseconds % 1000;

  return [hours, minutes, remainingSeconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":")
    .concat(separator, remainingMilliseconds.toString().padStart(3, "0"));
}

export function formatTranscript(
  segments: TranscriptSegment[],
  format: TranscriptFormat = "text",
  title = "Transcript",
): TranscriptOutput {
  const cleanedSegments = cleanSegments(segments);

  const plainText = cleanedSegments
    .map((segment) => segment.text)
    .join(" ")
    .replace(/\s+([,.!?;:])/g, "$1");

  if (format === "markdown") return { content: `# ${title}\n\n${plainText}`, extension: "md" };

  if (format === "vtt") {
    const cues = cleanedSegments
      .map(
        (segment) =>
          `${subtitleTimestamp(segment.offset, ".")} --> ${subtitleTimestamp(segment.offset + segment.duration, ".")}\n${segment.text}`,
      )
      .join("\n\n");
    return { content: `WEBVTT\n\n${cues}`, extension: "vtt" };
  }

  return { content: plainText, extension: "txt" };
}

export async function getTranscript(
  input: string,
  options: { fetcher?: TranscriptFetcher; signal?: AbortSignal } = {},
): Promise<VideoTranscript> {
  const videoId = getYouTubeVideoId(input);
  if (!videoId) throw new Error("Enter a valid YouTube video URL.");

  const transcriptFetcher = options.fetcher ?? defaultTranscriptFetcher;
  const result = await transcriptFetcher(videoId, {
    videoDetails: true,
    retries: 2,
    retryDelay: 500,
    signal: options.signal,
  });
  const segments = cleanSegments(result.segments);

  if (segments.length === 0) throw new Error("This video has no transcript.");

  return { title: result.videoDetails.title, segments };
}

export function transcriptFilename(title: string, extension: TranscriptOutput["extension"] = "txt"): string {
  const cleanedTitle = title
    .normalize("NFKD")
    .replace(/[<>:"/\\|?*]/g, "")
    .split("")
    .filter((character) => character.charCodeAt(0) > 31)
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "")
    .slice(0, 120);
  const windowsDeviceName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
  const safeTitle = windowsDeviceName.test(cleanedTitle) ? `_${cleanedTitle}` : cleanedTitle;

  return `${safeTitle || "YouTube transcript"}.${extension}`;
}
