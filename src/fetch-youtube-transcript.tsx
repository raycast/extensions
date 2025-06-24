// This script fetches and saves the transcript of a YouTube video.
// It provides a Raycast command interface for users to input a YouTube video ID,
// retrieves the video's transcript, processes it, and saves it to a local file.
// The script uses the YouTube Data API and handles user preferences for download locations.
import { showToast, Toast, getPreferenceValues, open } from "@raycast/api";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
// import https from "https";
import { exec } from "child_process";

// Define interfaces
interface ExtensionPreferences {
  defaultDownloadFolder: string;
  defaultLanguage: string;
}

interface TranscriptResult {
  transcript: string;
  title: string;
}

// Function to fetch URL content using https
// function fetchUrl(url: string): Promise<string> {
//   return new Promise((resolve, reject) => {
//     https
//       .get(url, (res) => {
//         let data = "";
//         res.on("data", (chunk) => (data += chunk));
//         res.on("end", () => resolve(data));
//         res.on("error", reject);
//       })
//       .on("error", reject);
//   });
// }

// Function to extract video ID from URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Full path to yt-dlp executable
const ytDlpPath = '/opt/homebrew/bin/yt-dlp';

// Helper function to promisify exec, makes async/await easier
function execCommand(command: string): Promise<{ stdout: string; stderr: string; }> {
  return new Promise((resolve, reject) => {
    exec(command.replace('yt-dlp', ytDlpPath), (error, stdout, stderr) => {
      if (error && !stderr.includes("WARNING")) {
        const errorMessage = `Command failed: ${error.message}\nstdout: ${stdout}\nstderr: ${stderr}`;
        reject(new Error(errorMessage));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function getYouTubeTranscriptAsPlainText(
  videoUrl: string,
  language: string = "en"
): Promise<{ transcript: string | null; videoTitle: string | null; }> {
  // Generate a unique temporary filename and output template
  const timestamp = Date.now();
  const baseOutputPath = path.join(
    os.tmpdir(),
    `temp_transcript_${timestamp}`
  );

  // The VTT file will be created with the appropriate language extension
  const tempFilePath = `${baseOutputPath}.${language}.vtt`;

  // First, get the video title using yt-dlp
  const titleCommand = `yt-dlp --get-title "${videoUrl}"`;
  let videoTitle: string | null = null;

  try {
    const { stdout: titleStdout, stderr: titleStderr } = await execCommand(titleCommand);
    videoTitle = titleStdout.trim();
    if (titleStderr && titleStderr.toLowerCase().includes("fail")) {
      console.error('Failed to get video title:', titleStderr);
      // Continue without the title if we can't get it
    }
  } catch (titleError) {
    console.error('Error fetching video title:', titleError);
    // Continue without the title
  }

  // Use a specific output template to ensure yt-dlp creates the file with exactly our desired name
  const command = `yt-dlp --write-auto-subs --skip-download --sub-lang ${language} --output "${baseOutputPath}" "${videoUrl}"`;

  let rawTranscriptContent: string | null = null; // Initialize as null
  try {
    // 1. Execute yt-dlp to download the VTT file
    const { stdout, stderr } = await execCommand(command);

    // Check stderr for potential errors even if the command exited cleanly
    if (stderr && !stderr.includes("WARNING")) {
      console.warn(
        `yt-dlp reported warnings or potential errors to stderr:\n${stderr}`
      );
    }

    // Also check if yt-dlp explicitly said it *couldn't* find subtitles
    if (stdout.includes("No captions found") || stdout.includes("no subtitles")) {
      console.log(
        `yt-dlp indicated no subtitles/captions found for: ${videoUrl}`
      );
      return { transcript: null, videoTitle }; // Return null transcript but include title if available
    }

    // 2. Read the downloaded VTT file
    try {
      rawTranscriptContent = await fs.readFile(tempFilePath, {
        encoding: "utf8",
      });
    } catch (fileReadError: unknown) {
      const errorMessage =
        fileReadError instanceof Error
          ? fileReadError.message
          : String(fileReadError);
      console.error(
        `Error reading temporary transcript file ${tempFilePath}:`,
        errorMessage
      );
      throw new Error(`Failed to read transcript file: ${errorMessage}`); // Re-throw as a clear error
    }

    // 3. Process the raw VTT content to get plain text
    let plainTextTranscript = "";
    if (rawTranscriptContent) {
      // Split content into lines
      const lines = rawTranscriptContent.split(/\r?\n/);
      // Process each line, skipping timestamps and other VTT formatting
      let previousLine = "";
      for (const line of lines) {
        // Skip empty lines, numeric timestamps, and webvtt header
        if (
          line.trim() === "" ||
          /^\d+$/.test(line.trim()) ||
          line.includes("WEBVTT") ||
          /^\d{2}:\d{2}:\d{2}\.\d{3}/.test(line) // Skip timestamp lines
        ) {
          continue;
        }
        // Clean HTML-like tags
        const cleanedLine = line.replace(/<[^>]*>/g, "").trim();
        // Only add the line if it's different from the previous line
        if (cleanedLine && cleanedLine !== previousLine) {
          plainTextTranscript += cleanedLine + " ";
          previousLine = cleanedLine;
        }
      }
    }

    // Remove any metadata like "Kind: captions Language: en" from the transcript
    let finalTranscript = plainTextTranscript.trim();
    // Check for metadata at the beginning and remove it
    finalTranscript = finalTranscript.replace(/^Kind:\s*captions\s*Language:\s*[a-z]{2}(\s|\n)+/i, "");
    // Also check for metadata anywhere in the text (in case it's not at the beginning)
    finalTranscript = finalTranscript.replace(/\s*Kind:\s*captions\s*Language:\s*[a-z]{2}(\s|\n)+/gi, " ");

    return { transcript: finalTranscript, videoTitle };

  } catch (execOrFileError: unknown) {
    const errorMessage =
      execOrFileError instanceof Error
        ? execOrFileError.message
        : String(execOrFileError);
    console.error(
      `An error occurred during transcript retrieval: ${errorMessage}`
    );
    throw new Error(`Transcript retrieval failed: ${errorMessage}`);
  } finally {
    // This block always runs, whether there's an error or not
    // 4. Clean up: Delete the temporary VTT file if it exists
    try {
      await fs.unlink(tempFilePath);
      console.log(`Cleaned up temporary file: ${tempFilePath}`);
    } catch (unlinkError: unknown) {
      // Ignore if file didn't exist or couldn't be deleted
    }
  }
}

// Function to fetch video transcript
async function getVideoTranscript(videoId: string): Promise<TranscriptResult> {
  const { defaultLanguage } = getPreferenceValues<ExtensionPreferences>();

  // Construct full YouTube URL from video ID
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Use yt-dlp to get the transcript
  const { transcript, videoTitle } = await getYouTubeTranscriptAsPlainText(videoUrl, defaultLanguage || "en");

  if (!transcript) {
    throw new Error("Transcript Not Available - No captions found in any language");
  }

  return { transcript, title: videoTitle || `YouTube Video ${videoId}` };
}

// Sanitize filename to remove invalid characters
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 255);
}

// Main command function
export default async function Command(props: { arguments: { videoUrl: string; }; }) {
  const { videoUrl } = props.arguments;

  if (!videoUrl) {
    await showToast({
      style: Toast.Style.Failure,
      title: "YouTube URL is required",
    });
    return;
  }

  try {
    // Extract video ID
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error("Invalid YouTube URL. Please provide a valid URL.");
    }

    // Show loading toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Fetching transcript...",
    });

    // Get transcript
    const { transcript, title } = await getVideoTranscript(videoId);

    // Get download location
    const { defaultDownloadFolder } = getPreferenceValues<ExtensionPreferences>();
    const downloadsFolder = defaultDownloadFolder || path.join(os.homedir(), "Downloads");

    // Create filename and save
    const sanitizedTitle = sanitizeFilename(title);
    const filename = path.join(downloadsFolder, `${sanitizedTitle}_transcript.txt`);
    await fs.writeFile(filename, transcript);

    // Show success toast with actions
    await showToast({
      style: Toast.Style.Success,
      title: "Transcript fetched and saved",
      message: `Saved to: ${filename}`,
      primaryAction: {
        title: "Open File",
        onAction: () => open(filename),
      },
      secondaryAction: {
        title: "Open Folder",
        onAction: () => open(downloadsFolder),
      },
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "Transcript Not Available",
    });
  }
}
