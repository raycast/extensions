import path from "path";
import fs from "fs";
import { getFFmpegPath } from "./ffmpeg";
import { execPromise } from "./exec";

export const ALLOWED_VIDEO_EXTENSIONS = [".mov", ".mp4", ".avi", ".mkv", ".mpg", ".webm"] as const;
export const ALLOWED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".tiff",
  ".tif",
  ".avif",
  ".bmp",
] as const;
export const ALLOWED_AUDIO_EXTENSIONS = [".mp3", ".aac", ".wav", ".m4a", ".flac"] as const;

export const videoConfig = {
  ffmpegOptions: {
    mp4: { videoCodec: "h264", audioCodec: "aac", fileExtension: ".mp4" },
    avi: { videoCodec: "libxvid", audioCodec: "mp3", fileExtension: ".avi" },
    mov: { videoCodec: "prores", audioCodec: "pcm_s16le", fileExtension: ".mov" },
    mkv: { videoCodec: "libx265", audioCodec: "aac", fileExtension: ".mkv" },
    mpg: { videoCodec: "mpeg2video", audioCodec: "mp3", fileExtension: ".mpg" },
    webm: { videoCodec: "libvpx-vp9", audioCodec: "libopus", fileExtension: ".webm" },
  },
};

export type VideoOutputFormats = keyof typeof videoConfig.ffmpegOptions;

// Audio configuration
export const audioConfig = {
  mp3: { audioCodec: "libmp3lame", fileExtension: ".mp3" },
  aac: { audioCodec: "aac", fileExtension: ".aac" },
  wav: { audioCodec: "pcm_s16le", fileExtension: ".wav" },
  flac: { audioCodec: "flac", fileExtension: ".flac" },
};

export type AudioOutputFormats = keyof typeof audioConfig;

// Image configuration
export const imageConfig = {
  jpg: { fileExtension: ".jpg" },
  png: { fileExtension: ".png" },
  webp: { fileExtension: ".webp" },
  heic: { fileExtension: ".heic" },
  tiff: { fileExtension: ".tiff" },
  avif: { fileExtension: ".avif" },
} as const;

export type ImageOutputFormats = keyof typeof imageConfig;

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
  quality?: string, // Represents 0-100, and "lossless" and AVIF
): Promise<string> {
  const formatOptions = imageConfig[outputFormat];
  if (!formatOptions) {
    throw new Error(`Unsupported image format: ${outputFormat}`);
  }

  const finalOutputPath = getUniqueOutputPath(filePath, formatOptions.fileExtension);

  try {
    if (outputFormat === "heic") {
      execPromise(
        `sips --setProperty format heic --setProperty formatOptions ${Number(quality)} "${filePath}" --out "${finalOutputPath}"`,
      );
    } else {
      // FFmpeg for all other image formats
      const ffmpegPath = await getFFmpegPath();
      let ffmpegCmd = `"${ffmpegPath}" -i "${filePath}"`;

      switch (outputFormat) {
        case "jpg":
          // mjpeg takes in 2 (best) to 31 (worst)
          ffmpegCmd += ` -c:v mjpeg -q:v ${Math.round(31 - (Number(quality) / 100) * 29)}`;
          break;
        case "png":
          ffmpegCmd += " -c:v png -compression_level 100";
          break;
        case "webp":
          ffmpegCmd += " -c:v libwebp";
          if (quality === "lossless") {
            // Lossless for WebP
            ffmpegCmd += " -lossless 1";
          } else {
            ffmpegCmd += ` -quality ${Number(quality)}`;
          }
          break;
        case "tiff":
          ffmpegCmd += " -c:v tiff -compression_algo lzw";
          break;
        case "avif":
          // libaom-av1 takes in 0 (best/lossless (unsure about it being truly lossless but after testing,
          // I @sacha_crispin, couldn't find a difference when "-lossless 1" was applied.
          // https://trac.ffmpeg.org/wiki/Encode/AV1 supports that theory)) to 63 (worst)
          ffmpegCmd += ` -c:v libaom-av1 -crf ${Math.round(63 - (Number(quality) / 100) * 63)} -still-picture 1`;
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

export async function convertVideo(
  filePath: string,
  outputFormat: VideoOutputFormats, // Changed from specific strings to type
  //quality?: string, // Optional quality parameter
): Promise<string> {
  const formatOptions = videoConfig.ffmpegOptions[outputFormat];
  const finalOutputPath = getUniqueOutputPath(filePath, formatOptions.fileExtension);

  const ffmpegPath = await getFFmpegPath();
  // Basic command, can be expanded with quality options for video
  let command = `"${ffmpegPath}" -i "${filePath}" -vcodec ${formatOptions.videoCodec} -acodec ${formatOptions.audioCodec}`;

  // TODO: Implement quality control for video formats
  // Example: Add a CRF for H.264 (mp4) if quality is a number 0-51 (lower is better)
  /* if (outputFormat === "mp4" && quality && !isNaN(Number(quality))) {
    const crf = Math.max(0, Math.min(51, Number(quality)));
    command += ` -crf ${crf}`;
  } */
  // Add more video quality options here based on codec and desired control

  command += ` "${finalOutputPath}"`;
  await execPromise(command);

  return finalOutputPath;
}

export async function convertAudio(
  filePath: string,
  outputFormat: AudioOutputFormats, // Changed from specific strings to type
  //quality?: string, // Optional quality parameter
): Promise<string> {
  const formatOptions = audioConfig[outputFormat];
  const finalOutputPath = getUniqueOutputPath(filePath, formatOptions.fileExtension);

  const ffmpegPath = await getFFmpegPath();
  // Basic command, can be expanded with quality options for audio
  let command = `"${ffmpegPath}" -i "${filePath}" -c:a ${formatOptions.audioCodec}`;

  // TODO: Implement quality control for audio formats
  // Example: Add VBR setting for MP3 if quality is a number 0-9 (lower is better VBR)
  /* if (outputFormat === "mp3" && quality && !isNaN(Number(quality))) {
    const vbr = Math.max(0, Math.min(9, Number(quality)));
    command += ` -q:a ${vbr}`;
  } */
  // Add more audio quality options here based on codec

  command += ` "${finalOutputPath}"`;
  await execPromise(command);

  return finalOutputPath;
}
