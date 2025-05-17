import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import path from "path";
import { convertImage, convertAudio, convertVideo, ImageOutputFormats } from "../utils/converter"; // Added ImageOutputFormats
import { execPromise } from "../utils/exec";

const ALLOWED_VIDEO_EXTENSIONS = [".mov", ".mp4", ".avi", ".mkv", ".mpg", ".webm"];
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".png", ".webp", ".heic", ".tiff", ".tif", ".avif", ".bmp", ".jpeg"];
const ALLOWED_AUDIO_EXTENSIONS = [".mp3", ".aac", ".wav", ".m4a", ".flac"];

interface ConverterFormProps {
  initialFiles?: string[];
}

export function ConverterForm({ initialFiles }: ConverterFormProps) {
  const [selectedFileType, setSelectedFileType] = useState<"video" | "image" | "audio" | null>(null);
  const [currentFiles, setCurrentFiles] = useState<string[]>(initialFiles || []);
  const [outputFormat, setOutputFormat] = useState<string>("jpg");
  const [currentQualitySetting, setCurrentQualitySetting] = useState<string>("80");

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      handleFileSelect(initialFiles);
    }
  }, [initialFiles]);

  useEffect(() => {
    if (selectedFileType === "image") {
      setOutputFormat("jpg"); // Default to JPG for images
      setCurrentQualitySetting("80"); // Default quality for JPG (0-100 scale)
    } else if (selectedFileType === "audio") {
      setOutputFormat("mp3");
      setCurrentQualitySetting("default");
    } else if (selectedFileType === "video") {
      setOutputFormat("mp4");
      setCurrentQualitySetting("default");
    }
  }, [selectedFileType]);

  const handleOutputFormatChange = (newFormat: string) => {
    setOutputFormat(newFormat);

    if (selectedFileType === "image") {
      let newQuality: string;
      switch (newFormat) {
        case "webp":
          newQuality = "100";
          break;
        case "jpg":
        case "heic":
          newQuality = "80";
          break;
        case "png":
          newQuality = "default";
          break;
        case "avif":
          newQuality = "80";
          break;
        // For formats like "tiff" that don't have a quality dropdown,
        // currentQualitySetting doesn't need to change or is irrelevant.
        default:
          return; // Do nothing if the format isn't one with a specific quality default.
      }
      setCurrentQualitySetting(newQuality);
    }
    // Add similar logic for audio/video if their quality settings become complex
    // else if (selectedFileType === "audio") { setCurrentQualitySetting("default"); }
    // else if (selectedFileType === "video") { setCurrentQualitySetting("default"); }
  };

  const handleFileSelect = (files: string[]) => {
    if (files.length === 0) {
      setCurrentFiles([]);
      setSelectedFileType(null);
      return true;
    }

    try {
      const firstFileExtension = path.extname(files[0])?.toLowerCase() || "";
      const isFirstFileVideo = ALLOWED_VIDEO_EXTENSIONS.includes(firstFileExtension);
      const isFirstFileImage = ALLOWED_IMAGE_EXTENSIONS.includes(firstFileExtension);
      const isFirstFileAudio = ALLOWED_AUDIO_EXTENSIONS.includes(firstFileExtension);

      let determinedFileType: "video" | "image" | "audio" | null = null;
      if (isFirstFileVideo) determinedFileType = "video";
      else if (isFirstFileImage) determinedFileType = "image";
      else if (isFirstFileAudio) determinedFileType = "audio";

      if (!determinedFileType) {
        // If the first file is not of a recognized type, filter it out and try the next one, or show error if all are invalid.
        const validFiles = files.filter((file) => {
          const ext = path.extname(file)?.toLowerCase() || "";
          return (
            ALLOWED_VIDEO_EXTENSIONS.includes(ext) ||
            ALLOWED_IMAGE_EXTENSIONS.includes(ext) ||
            ALLOWED_AUDIO_EXTENSIONS.includes(ext)
          );
        });
        if (validFiles.length === 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "Invalid selection",
            message: "No valid media files selected. Please select video, image, or audio files.",
          });
          setCurrentFiles([]);
          setSelectedFileType(null);
          return false;
        }
        // Re-run with only valid files, this will re-determine the type based on the new first file.
        return handleFileSelect(validFiles);
      }

      const allowedExtensionsForType =
        determinedFileType === "video"
          ? ALLOWED_VIDEO_EXTENSIONS
          : determinedFileType === "image"
            ? ALLOWED_IMAGE_EXTENSIONS
            : ALLOWED_AUDIO_EXTENSIONS;

      const filteredFiles = files.filter((file) => {
        const extension = path.extname(file)?.toLowerCase() || "";
        return allowedExtensionsForType.includes(extension);
      });

      if (filteredFiles.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid selection",
          message: `No files matching the determined type (${determinedFileType}) were found. Mixed types are not supported.`,
        });
        setCurrentFiles([]);
        setSelectedFileType(null);
        return false;
      }

      // Check for mixed types based on the initially determined type
      const hasMixedTypesAfterFiltering = files.some((file) => {
        const extension = path.extname(file)?.toLowerCase() || "";
        // Check if this file belongs to the determined type
        if (determinedFileType === "video" && !ALLOWED_VIDEO_EXTENSIONS.includes(extension)) return true;
        if (determinedFileType === "image" && !ALLOWED_IMAGE_EXTENSIONS.includes(extension)) return true;
        if (determinedFileType === "audio" && !ALLOWED_AUDIO_EXTENSIONS.includes(extension)) return true;
        return false;
      });

      // This check is a bit redundant if filteredFiles is used, but kept for explicit mixed type error
      if (hasMixedTypesAfterFiltering && files.length !== filteredFiles.length) {
        showToast({
          style: Toast.Style.Failure,
          title: "Mixed file types",
          message:
            "Please select only one type of media (video, image, or audio). Valid files of the first detected type have been kept.",
        });
      }

      setCurrentFiles(filteredFiles);
      setSelectedFileType(determinedFileType);

      return true;
    } catch (error) {
      console.error("Error in handleFileSelect:", error);
      setSelectedFileType(null);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!currentFiles || currentFiles.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
        message: "Please select at least one file to convert",
      });
      return;
    }

    const fileExtension = path.extname(currentFiles[0]).toLowerCase();
    const isInputVideo = ALLOWED_VIDEO_EXTENSIONS.includes(fileExtension);
    const isInputImage = ALLOWED_IMAGE_EXTENSIONS.includes(fileExtension);
    const isInputAudio = ALLOWED_AUDIO_EXTENSIONS.includes(fileExtension);
    // Use outputFormat state instead of values.format
    const isOutputVideo = ["mp4", "avi", "mkv", "mov", "mpg", "webm"].includes(outputFormat);
    const isOutputImage = ["jpg", "png", "webp", "heic", "tiff", "avif"].includes(outputFormat);

    if (!isInputVideo && !isInputImage && !isInputAudio) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid file type",
        message: "Please select a valid media file",
      });
      return;
    }

    if ((isInputVideo && isOutputImage) || (isInputImage && isOutputVideo) || (isInputAudio && isOutputVideo)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid conversion",
        message: "Cannot convert between video and image formats",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Converting file...",
    });

    for (const item of currentFiles) {
      try {
        let outputPath = "";
        if (isInputImage) {
          // Pass outputFormat and currentQualitySetting
          outputPath = await convertImage(item, outputFormat as ImageOutputFormats, currentQualitySetting);
        } else if (isInputAudio) {
          outputPath = await convertAudio(item, outputFormat as "mp3" | "aac" | "wav" | "flac");
        } else {
          outputPath = await convertVideo(item, outputFormat as "mp4" | "avi" | "mkv" | "mov" | "mpg" | "webm");
        }

        await toast.hide();
        await showToast({
          style: Toast.Style.Success,
          title: "File converted successfully!",
          message: "Press ⌘O to open the converted file",
          primaryAction: {
            title: "Open File",
            shortcut: { modifiers: ["cmd"], key: "o" },
            onAction: () => {
              execPromise(`open "${outputPath}"`);
            },
          },
        });
      } catch (error) {
        await toast.hide();
        await showToast({
          style: Toast.Style.Failure,
          title: "Conversion failed",
          message: String(error),
        });
      }
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="videoFile"
        title="Select files"
        allowMultipleSelection={true}
        value={currentFiles}
        onChange={(newFiles) => {
          handleFileSelect(newFiles);
        }}
      />
      {selectedFileType && (
        <Form.Dropdown
          id="format"
          title="Select output format"
          value={outputFormat} // Controlled component
          onChange={handleOutputFormatChange} // Update state on change using the new handler
        >
          {selectedFileType === "image" ? (
            <Form.Dropdown.Section title="Image Formats">
              <Form.Dropdown.Item value="jpg" title=".jpg" />
              <Form.Dropdown.Item value="png" title=".png" />
              <Form.Dropdown.Item value="webp" title=".webp" />
              <Form.Dropdown.Item value="heic" title=".heic" />
              <Form.Dropdown.Item value="tiff" title=".tiff" />
              <Form.Dropdown.Item value="avif" title=".avif" />
            </Form.Dropdown.Section>
          ) : selectedFileType === "audio" ? (
            <Form.Dropdown.Section title="Audio Formats">
              <Form.Dropdown.Item value="mp3" title=".mp3" />
              <Form.Dropdown.Item value="aac" title=".aac" />
              <Form.Dropdown.Item value="wav" title=".wav" />
              <Form.Dropdown.Item value="flac" title=".flac" />
            </Form.Dropdown.Section>
          ) : (
            <Form.Dropdown.Section title="Video Formats">
              <Form.Dropdown.Item value="mp4" title=".mp4" />
              <Form.Dropdown.Item value="avi" title=".avi" />
              <Form.Dropdown.Item value="mkv" title=".mkv" />
              <Form.Dropdown.Item value="mov" title=".mov" />
              <Form.Dropdown.Item value="mpg" title=".mpg" />
              <Form.Dropdown.Item value="webm" title=".webm" />
            </Form.Dropdown.Section>
          )}
        </Form.Dropdown>
      )}
      {/* Conditionally render Quality dropdown for images (excluding TIFF and PNG) */}
      {selectedFileType === "image" && outputFormat !== "tiff" && outputFormat !== "png" && (
        <Form.Dropdown
          id="qualitySetting"
          title={`${outputFormat.toUpperCase()} Quality`}
          value={currentQualitySetting}
          onChange={setCurrentQualitySetting}
        >
          {outputFormat === "avif" && <Form.Dropdown.Item value="ffmpeg-default" title="Default (FFmpeg CRF)" />}
          {/* Generate 0-100 in steps of 5 */}
          {[...Array(21).keys()].map((i) => {
            const q = i * 5;
            let title = q.toString();
            if (outputFormat === "avif") {
              if (q === 0) title = "0 (Lowest Quality)";
              else if (q === 100) title = "100 (Highest Quality)";
            }
            return <Form.Dropdown.Item key={`${outputFormat}-q-${q}`} value={q.toString()} title={title} />;
          })}
          {outputFormat === "webp" && <Form.Dropdown.Item value="lossless" title="Lossless (WebP)" />}
        </Form.Dropdown>
      )}
    </Form>
  );
}
