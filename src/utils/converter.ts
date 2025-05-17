import path from "path";
import fs from "fs";
import { getFFmpegPath } from "./ffmpeg";
import { execPromise } from "./exec";
import { execSync } from "child_process";

const config = {
  ffmpegOptions: {
    mp4: {
      videoCodec: "h264",
      audioCodec: "aac",
      fileExtension: ".mp4",
    },
    avi: {
      videoCodec: "libxvid",
      audioCodec: "mp3",
      fileExtension: ".avi",
    },
    mov: {
      videoCodec: "prores",
      audioCodec: "pcm_s16le",
      fileExtension: ".mov",
    },
    mkv: {
      videoCodec: "libx265",
      audioCodec: "aac",
      fileExtension: ".mkv",
    },
    mpg: {
      videoCodec: "mpeg2video",
      audioCodec: "mp3",
      fileExtension: ".mpg",
    },
    webm: {
      videoCodec: "libvpx-vp9",
      audioCodec: "libopus",
      fileExtension: ".webm",
    },
  },
};

export type VideoOutputFormats = keyof typeof config.ffmpegOptions;

// Audio configuration
export const audioConfig = {
  mp3: {
    audioCodec: "libmp3lame",
    fileExtension: ".mp3",
  },
  aac: {
    audioCodec: "aac",
    fileExtension: ".aac",
  },
  wav: {
    audioCodec: "pcm_s16le",
    fileExtension: ".wav",
  },
  flac: {
    audioCodec: "flac",
    fileExtension: ".flac",
  },
};

export type AudioOutputFormats = keyof typeof audioConfig;

// Image configuration
interface ImageFormatConfig {
  fileExtension: string;
}

const imageConfig: Record<string, ImageFormatConfig> = {
  jpg: {
    fileExtension: ".jpg",
  },
  png: {
    fileExtension: ".png",
  },
  webp: {
    fileExtension: ".webp",
  },
  heic: {
    fileExtension: ".heic",
  },
  tiff: {
    fileExtension: ".tiff",
  },
  avif: {
    fileExtension: ".avif",
  },
};

export type ImageOutputFormats = "jpg" | "png" | "webp" | "heic" | "tiff" | "avif"; // Added avif

export function getUniqueOutputPath(filePath: string, extension: string): string {
  const outputFilePath = filePath.replace(path.extname(filePath), extension);
  let finalOutputPath = outputFilePath;
  let counter = 1;

  while (fs.existsSync(finalOutputPath)) {
    const fileName = path.basename(outputFilePath, extension);
    const dirName = path.dirname(outputFilePath);
    finalOutputPath = path.join(dirName, `${fileName}(${counter})${extension}`);
    counter++;
  }

  return finalOutputPath;
}

export async function convertImage(
  filePath: string,
  outputFormat: ImageOutputFormats,
  quality?: string, // Represents 0-100, "lossless", or "ffmpeg-default" for AVIF
): Promise<string> {
  const formatOptions = imageConfig[outputFormat];
  if (!formatOptions) {
    throw new Error(`Unsupported image format: ${outputFormat}`);
  }

  const finalOutputPath = getUniqueOutputPath(filePath, formatOptions.fileExtension);

  try {
    if (outputFormat === "heic") {
      // Use sips for HEIC conversion
      let sipsCmd = `sips --setProperty format heic`;
      if (quality && !isNaN(Number(quality))) {
        const numericQuality = Math.max(0, Math.min(100, Number(quality)));
        sipsCmd += ` --setProperty formatOptions ${numericQuality}`;
      } else {
        sipsCmd += ` --setProperty formatOptions 80`; // Default quality for HEIC via sips
      }
      sipsCmd += ` "${filePath}" --out "${finalOutputPath}"`;
      execSync(sipsCmd); // Using execSync for simplicity, consider execPromise for async
    } else {
      // FFmpeg for all other image formats
      const ffmpegPath = await getFFmpegPath();
      let ffmpegCmd = `"${ffmpegPath}" -i "${filePath}"`;

      switch (outputFormat) {
        case "jpg":
          ffmpegCmd += " -c:v mjpeg";
          if (quality && !isNaN(Number(quality))) {
            const numericQuality = Math.max(0, Math.min(100, Number(quality)));
            const qValue = Math.round(1 + ((100 - numericQuality) / 100) * 30);
            ffmpegCmd += ` -qscale:v ${qValue}`;
          } else {
            const qValue = Math.round(1 + ((100 - 80) / 100) * 30);
            ffmpegCmd += ` -qscale:v ${qValue}`;
          }
          break;
        case "png":
          ffmpegCmd += " -c:v png -compression_level 100";
          break;
        case "webp":
          ffmpegCmd += " -c:v libwebp";
          if (quality === "lossless") {
            ffmpegCmd += " -lossless 1";
          } else if (quality && !isNaN(Number(quality))) {
            const numericQuality = Math.max(0, Math.min(100, Number(quality)));
            ffmpegCmd += ` -quality ${numericQuality}`;
          } else {
            ffmpegCmd += " -quality 100"; // Default to 100 for WebP
          }
          break;
        // HEIC is handled above by sips
        case "tiff":
          ffmpegCmd += " -c:v tiff -compression_algo lzw";
          break;
        case "avif":
          ffmpegCmd += " -c:v libaom-av1";
          if (quality === "ffmpeg-default") {
            ffmpegCmd += " -crf 30";
          } else if (quality && !isNaN(Number(quality))) {
            const uiQuality = Math.max(0, Math.min(100, Number(quality)));
            const crf = Math.round(63 - (uiQuality / 100) * 63);
            ffmpegCmd += ` -crf ${crf}`;
          } else {
            const crf = Math.round(63 - (80 / 100) * 63);
            ffmpegCmd += ` -crf ${crf}`;
          }
          ffmpegCmd += " -still-picture 1";
          break;
      }
      ffmpegCmd += ` "${finalOutputPath}"`;
      await execPromise(ffmpegCmd);
    }
    return finalOutputPath;
  } catch (error) {
    console.error(`Error converting ${filePath} to ${outputFormat}:`, error);
    throw error;
  }
}

export async function optimizeImage(filePath: string, quality: number = 100): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const finalOutputPath = getUniqueOutputPath(filePath, `_optimized${ext}`);

  try {
    switch (ext) {
      case ".heic":
        execSync(
          `sips --setProperty format heic --setProperty formatOptions ${quality} "${filePath}" --out "${finalOutputPath}"`,
        );
        break;
      case ".jpg":
      case ".jpeg":
        // Use sips for optimization with quality control
        execSync(
          `sips --setProperty format jpeg --setProperty formatOptions ${quality} "${filePath}" --out "${finalOutputPath}"`,
        );
        break;
      default:
        throw new Error(`Optimization not supported for ${ext} files`);
    }
    return finalOutputPath;
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to optimize image: ${err.message}`);
  }
}

export async function convertVideo(
  filePath: string,
  outputFormat: VideoOutputFormats, // Changed from specific strings to type
  quality?: string, // Optional quality parameter
): Promise<string> {
  const formatOptions = config.ffmpegOptions[outputFormat];
  const finalOutputPath = getUniqueOutputPath(filePath, formatOptions.fileExtension);

  const ffmpegPath = await getFFmpegPath();
  // Basic command, can be expanded with quality options for video
  let command = `"${ffmpegPath}" -i "${filePath}" -vcodec ${formatOptions.videoCodec} -acodec ${formatOptions.audioCodec}`;

  // Example: Add a CRF for H.264 (mp4) if quality is a number 0-51 (lower is better)
  if (outputFormat === "mp4" && quality && !isNaN(Number(quality))) {
    const crf = Math.max(0, Math.min(51, Number(quality)));
    command += ` -crf ${crf}`;
  }
  // Add more video quality options here based on codec and desired control

  command += ` "${finalOutputPath}"`;
  await execPromise(command);

  return finalOutputPath;
}

export async function convertAudio(
  filePath: string,
  outputFormat: AudioOutputFormats, // Changed from specific strings to type
  quality?: string, // Optional quality parameter
): Promise<string> {
  const formatOptions = audioConfig[outputFormat];
  const finalOutputPath = getUniqueOutputPath(filePath, formatOptions.fileExtension);

  const ffmpegPath = await getFFmpegPath();
  // Basic command, can be expanded with quality options for audio
  let command = `"${ffmpegPath}" -i "${filePath}" -c:a ${formatOptions.audioCodec}`;

  // Example: Add VBR setting for MP3 if quality is a number 0-9 (lower is better VBR)
  if (outputFormat === "mp3" && quality && !isNaN(Number(quality))) {
    const vbr = Math.max(0, Math.min(9, Number(quality)));
    command += ` -q:a ${vbr}`;
  }
  // Add more audio quality options here based on codec

  command += ` "${finalOutputPath}"`;
  await execPromise(command);

  return finalOutputPath;
}
