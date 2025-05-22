import {
  convertMedia,
  OUTPUT_IMAGE_EXTENSIONS,
  OUTPUT_AUDIO_EXTENSIONS,
  OUTPUT_VIDEO_EXTENSIONS,
  /* OUTPUT_ALL_EXTENSIONS, */
  INPUT_IMAGE_EXTENSIONS,
  INPUT_AUDIO_EXTENSIONS,
  INPUT_VIDEO_EXTENSIONS,
} from "../utils/converter";
import { isFFmpegInstalled } from "../utils/ffmpeg";
import { getFullPath } from "../utils/get-full-path";
import { Tool } from "@raycast/api";
import path from "path";

function getMediaType(filePath: string): "image" | "audio" | "video" | null {
  const extension = path.extname(filePath).toLowerCase();
  if (INPUT_IMAGE_EXTENSIONS.includes(extension as (typeof INPUT_IMAGE_EXTENSIONS)[number])) return "image";
  if (INPUT_AUDIO_EXTENSIONS.includes(extension as (typeof INPUT_AUDIO_EXTENSIONS)[number])) return "audio";
  if (INPUT_VIDEO_EXTENSIONS.includes(extension as (typeof INPUT_VIDEO_EXTENSIONS)[number])) return "video";
  return null;
}

type Input = {
  inputPath: string;
  // I cannot, for the life of me, figure out how to get the type of this array to be a union of its values
  // so I have to type it manually. @sacha_crispin
  // Want to try?
  // Uncomment OUTPUT_ALL_EXTENSIONS in import in ../utils/converter.ts
  outputFileType: // VIDEO
  | ".mp4"
    | ".avi"
    | ".mov"
    | ".mkv"
    | ".mpg"
    | ".webm"
    // AUDIO
    | ".mp3"
    | ".aac"
    | ".wav"
    | ".flac"
    // IMAGE
    | ".jpg"
    | ".png"
    | ".webp"
    | ".heic"
    | ".tiff"
    | ".avif";
  quality?: string;
};

export default async function ConvertMedia({ inputPath, outputFileType, quality }: Input) {
  const installed = await isFFmpegInstalled();
  if (!installed) {
    return {
      type: "error",
      message: "FFmpeg is not installed. Please install FFmpeg to use this tool.",
    };
  }

  const fullPath = await getFullPath(inputPath);
  const mediaType = getMediaType(fullPath);

  if (!mediaType) {
    return {
      type: "error",
      message: `Unsupported input file type for path: ${fullPath}`,
    };
  }

  try {
    let outputPath: string;
    // Check if the outputFileType is a valid format for the determined mediaType
    if (mediaType === "image" && (OUTPUT_IMAGE_EXTENSIONS as ReadonlyArray<string>).includes(outputFileType)) {
      outputPath = await convertMedia(fullPath, outputFileType as (typeof OUTPUT_IMAGE_EXTENSIONS)[number], quality);
    } else if (mediaType === "audio" && (OUTPUT_AUDIO_EXTENSIONS as ReadonlyArray<string>).includes(outputFileType)) {
      outputPath = await convertMedia(fullPath, outputFileType as (typeof OUTPUT_AUDIO_EXTENSIONS)[number]);
    } else if (mediaType === "video" && (OUTPUT_VIDEO_EXTENSIONS as ReadonlyArray<string>).includes(outputFileType)) {
      outputPath = await convertMedia(fullPath, outputFileType as (typeof OUTPUT_VIDEO_EXTENSIONS)[number]);
    } else {
      return {
        type: "error",
        message: `Cannot convert ${mediaType} to ${outputFileType}. Invalid conversion pair.`,
      };
    }

    return {
      type: "success",
      message: `The ${mediaType} was converted successfully. Converted file path: ${outputPath}`,
    };
  } catch (error) {
    console.error(error);
    return {
      type: "error",
      message: `The ${mediaType} could not be converted. Error: ${error}`,
    };
  }
}

export const confirmation: Tool.Confirmation<Input> = async ({ inputPath, outputFileType, quality }: Input) => {
  const fullPath = await getFullPath(inputPath);
  const mediaType = getMediaType(fullPath);
  const message = "This will create a new file in the same directory.";
  const info = [
    { name: "Input Path", value: fullPath },
    { name: "Input Media Type", value: mediaType || "Unknown" },
    { name: "Output File Type", value: outputFileType },
  ];
  if (
    quality &&
    mediaType === "image" &&
    (outputFileType === ".jpg" ||
      outputFileType === ".webp" ||
      outputFileType === ".avif" ||
      outputFileType === ".heic")
  ) {
    info.push({ name: "Quality", value: quality });
  }

  return {
    message,
    info,
  };
};
