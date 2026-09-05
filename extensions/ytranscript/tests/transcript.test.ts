import { describe, expect, test } from "bun:test";
import type { TranscriptResult } from "youtube-transcript-plus";
import { formatTranscript, getTranscript, getYouTubeVideoId, transcriptFilename } from "../src/transcript";

describe("getYouTubeVideoId", () => {
  test.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=12", "dQw4w9WgXcQ"],
    ["https://youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtube.com/live/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("extracts an ID from %s", (url, expected) => {
    expect(getYouTubeVideoId(url)).toBe(expected);
  });

  test.each([
    "",
    "dQw4w9WgXcQ",
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=short",
    "ftp://youtube.com/watch?v=dQw4w9WgXcQ",
  ])("rejects %s", (url) => {
    expect(getYouTubeVideoId(url)).toBeNull();
  });
});

const segments: TranscriptResult["segments"] = [
  { text: "Hello   there ", duration: 1.5, offset: 1, lang: "en" },
  { text: " world ! We&#39;re &amp; we&#x27;re", duration: 2, offset: 2.5, lang: "en" },
];

test("formatTranscript returns clean plain text by default", () => {
  expect(formatTranscript(segments)).toEqual({ content: "Hello there world! We're & we're", extension: "txt" });
});

test("formatTranscript supports Markdown", () => {
  expect(formatTranscript(segments, "markdown", "Test video")).toEqual({
    content: "# Test video\n\nHello there world! We're & we're",
    extension: "md",
  });
});

test("formatTranscript supports WebVTT", () => {
  expect(formatTranscript(segments, "vtt")).toEqual({
    content:
      "WEBVTT\n\n00:00:01.000 --> 00:00:02.500\nHello there\n\n00:00:02.500 --> 00:00:04.500\nworld ! We're & we're",
    extension: "vtt",
  });
});

test("getTranscript validates before it fetches", async () => {
  let called = false;
  const fetcher = async (): Promise<TranscriptResult> => {
    called = true;
    throw new Error("should not run");
  };

  expect(getTranscript("not a URL", { fetcher })).rejects.toThrow("Enter a valid YouTube video URL.");
  expect(called).toBe(false);
});

test("getTranscript returns the title and formatted text", async () => {
  const fetcher = async (): Promise<TranscriptResult> => ({
    videoDetails: {
      videoId: "dQw4w9WgXcQ",
      title: "Test video",
      author: "Test author",
      channelId: "channel",
      lengthSeconds: 2,
      viewCount: 1,
      description: "",
      keywords: [],
      thumbnails: [],
      isLiveContent: false,
    },
    segments: [{ text: "Test transcript", duration: 2, offset: 0, lang: "en" }],
  });

  const transcript = await getTranscript("https://youtu.be/dQw4w9WgXcQ", { fetcher });
  expect(transcript.title).toBe("Test video");
  expect(formatTranscript(transcript.segments).content).toBe("Test transcript");
});

test("transcriptFilename removes unsafe filename characters", () => {
  expect(transcriptFilename('A / useful: video? "yes"')).toBe("A useful video yes.txt");
  expect(transcriptFilename("***")).toBe("YouTube transcript.txt");
  expect(transcriptFilename("CON")).toBe("_CON.txt");
  expect(transcriptFilename("Title... ")).toBe("Title.txt");
  expect(transcriptFilename("Transcript", "md")).toBe("Transcript.md");
});
