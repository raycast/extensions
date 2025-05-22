import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import path from "path";
import {
  convertImage,
  convertAudio,
  convertVideo,
  ImageOutputFormats,
  VideoOutputFormats,
  AudioOutputFormats,
  ALLOWED_VIDEO_EXTENSIONS,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_AUDIO_EXTENSIONS,
  videoConfig,
  audioConfig,
  imageConfig,
} from "../utils/converter";
import { execPromise } from "../utils/exec";

interface ConverterFormProps {
  initialFiles?: string[];
}

export function ConverterForm({ initialFiles }: ConverterFormProps) {
  const [selectedFileType, setSelectedFileType] = useState<"video" | "image" | "audio" | null>(null);
  const [currentFiles, setCurrentFiles] = useState<string[]>(initialFiles || []);
  const [outputFormat, setOutputFormat] = useState<string>("");
  const [currentQualitySetting, setCurrentQualitySetting] = useState<string>("");

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      handleFileSelect(initialFiles);
    }
  }, [initialFiles]);

  const handleOutputFormatChange = (newFormat: string) => {
    setOutputFormat(newFormat);
    if (selectedFileType === "image") {
      setCurrentQualitySetting("80");
    }
  };

  const handleFileSelect = (files: string[]) => {
    if (files.length === 0) {
      setCurrentFiles([]);
      setSelectedFileType(null);
      return true;
    }

    try {
      const firstFileExtension = path.extname(files[0])?.toLowerCase() || "";
      const isFirstFileVideo = ALLOWED_VIDEO_EXTENSIONS.includes(
        firstFileExtension as (typeof ALLOWED_VIDEO_EXTENSIONS)[number],
      );
      const isFirstFileImage = ALLOWED_IMAGE_EXTENSIONS.includes(
        firstFileExtension as (typeof ALLOWED_IMAGE_EXTENSIONS)[number],
      );
      const isFirstFileAudio = ALLOWED_AUDIO_EXTENSIONS.includes(
        firstFileExtension as (typeof ALLOWED_AUDIO_EXTENSIONS)[number],
      );

      let determinedFileType: "video" | "image" | "audio" | null = null;
      if (isFirstFileVideo) determinedFileType = "video";
      else if (isFirstFileImage) determinedFileType = "image";
      else if (isFirstFileAudio) determinedFileType = "audio";

      if (!determinedFileType) {
        const validFiles = files.filter((file) => {
          const ext = path.extname(file)?.toLowerCase() || "";
          return (
            ALLOWED_VIDEO_EXTENSIONS.includes(ext as (typeof ALLOWED_VIDEO_EXTENSIONS)[number]) ||
            ALLOWED_IMAGE_EXTENSIONS.includes(ext as (typeof ALLOWED_IMAGE_EXTENSIONS)[number]) ||
            ALLOWED_AUDIO_EXTENSIONS.includes(ext as (typeof ALLOWED_AUDIO_EXTENSIONS)[number])
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
        return handleFileSelect(validFiles);
      }

      const filteredFiles = files.filter((file) => {
        const extension = path.extname(file)?.toLowerCase() || "";
        if (determinedFileType === "video") {
          return ALLOWED_VIDEO_EXTENSIONS.includes(extension as (typeof ALLOWED_VIDEO_EXTENSIONS)[number]);
        } else if (determinedFileType === "image") {
          return ALLOWED_IMAGE_EXTENSIONS.includes(extension as (typeof ALLOWED_IMAGE_EXTENSIONS)[number]);
        } else if (determinedFileType === "audio") {
          return ALLOWED_AUDIO_EXTENSIONS.includes(extension as (typeof ALLOWED_AUDIO_EXTENSIONS)[number]);
        }
        return false;
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

      const hasMixedTypesAfterFiltering = files.some((file) => {
        const extension = path.extname(file)?.toLowerCase() || "";
        if (
          determinedFileType === "video" &&
          !ALLOWED_VIDEO_EXTENSIONS.includes(extension as (typeof ALLOWED_VIDEO_EXTENSIONS)[number])
        )
          return true;
        if (
          determinedFileType === "image" &&
          !ALLOWED_IMAGE_EXTENSIONS.includes(extension as (typeof ALLOWED_IMAGE_EXTENSIONS)[number])
        )
          return true;
        if (
          determinedFileType === "audio" &&
          !ALLOWED_AUDIO_EXTENSIONS.includes(extension as (typeof ALLOWED_AUDIO_EXTENSIONS)[number])
        )
          return true;
        return false;
      });

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
      if (determinedFileType === "image") setOutputFormat("jpg");
      else if (determinedFileType === "audio") setOutputFormat("mp3");
      else if (determinedFileType === "video") setOutputFormat("mp4");
      if (determinedFileType === "image") setCurrentQualitySetting("80");

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
    const isInputVideo = ALLOWED_VIDEO_EXTENSIONS.includes(fileExtension as (typeof ALLOWED_VIDEO_EXTENSIONS)[number]);
    const isInputImage = ALLOWED_IMAGE_EXTENSIONS.includes(fileExtension as (typeof ALLOWED_IMAGE_EXTENSIONS)[number]);
    const isInputAudio = ALLOWED_AUDIO_EXTENSIONS.includes(fileExtension as (typeof ALLOWED_AUDIO_EXTENSIONS)[number]);

    const isOutputVideo = Object.keys(videoConfig.ffmpegOptions).includes(outputFormat);
    const isOutputImage = Object.keys(imageConfig).includes(outputFormat);
    const isOutputAudio = Object.keys(audioConfig).includes(outputFormat);

    if (!isInputVideo && !isInputImage && !isInputAudio) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid file type",
        message: "Please select a valid media file",
      });
      return;
    }

    if (isInputVideo && (isOutputImage || isOutputAudio)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid conversion",
        message: "Cannot convert video to image or audio formats directly.",
      });
      return;
    }
    if (isInputImage && (isOutputVideo || isOutputAudio)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid conversion",
        message: "Cannot convert image to video or audio formats directly.",
      });
      return;
    }
    if (isInputAudio && (isOutputVideo || isOutputImage)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid conversion",
        message: "Cannot convert audio to video or image formats directly.",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Converting file..." });

    for (const item of currentFiles) {
      try {
        let outputPath: string;
        if (isInputImage) {
          outputPath = await convertImage(item, outputFormat as ImageOutputFormats, currentQualitySetting);
        } else if (isInputAudio) {
          outputPath = await convertAudio(item, outputFormat as AudioOutputFormats);
        } else {
          outputPath = await convertVideo(item, outputFormat as VideoOutputFormats);
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
        await showToast({ style: Toast.Style.Failure, title: "Conversion failed", message: String(error) });
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
        id="selectFiles"
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
          value={outputFormat}
          onChange={handleOutputFormatChange}
        >
          {selectedFileType === "image" ? (
            <Form.Dropdown.Section title="Image Formats">
              {(Object.keys(imageConfig) as Array<ImageOutputFormats>).map((format) => (
                <Form.Dropdown.Item key={format} value={format} title={imageConfig[format].fileExtension} />
              ))}
            </Form.Dropdown.Section>
          ) : selectedFileType === "audio" ? (
            <Form.Dropdown.Section title="Audio Formats">
              {(Object.keys(audioConfig) as Array<AudioOutputFormats>).map((format) => (
                <Form.Dropdown.Item key={format} value={format} title={audioConfig[format].fileExtension} />
              ))}
            </Form.Dropdown.Section>
          ) : (
            <Form.Dropdown.Section title="Video Formats">
              {(Object.keys(videoConfig.ffmpegOptions) as Array<VideoOutputFormats>).map((format) => (
                <Form.Dropdown.Item
                  key={format}
                  value={format}
                  title={videoConfig.ffmpegOptions[format].fileExtension}
                />
              ))}
            </Form.Dropdown.Section>
          )}
        </Form.Dropdown>
      )}
      {selectedFileType === "image" &&
        outputFormat &&
        imageConfig[outputFormat as ImageOutputFormats] &&
        (outputFormat !== "tiff" && outputFormat !== "png" ? (
          <Form.Dropdown
            id="qualitySetting"
            title={`Select quality`}
            value={currentQualitySetting}
            onChange={setCurrentQualitySetting}
          >
            <Form.Dropdown.Section>
              {[...Array(21).keys()].map((i) => {
                const q = i * 5;
                const value = q.toString();
                const title = outputFormat === "avif" && q === 100 ? `100 (lossless)` : value;

                return <Form.Dropdown.Item key={`${outputFormat}-q-${q}`} value={value} title={title} />;
              })}
            </Form.Dropdown.Section>
            {outputFormat === "webp" && (
              <>
                <Form.Dropdown.Section>
                  <Form.Dropdown.Item value="lossless" title="Lossless" />
                </Form.Dropdown.Section>
              </>
            )}
          </Form.Dropdown>
        ) : (
          <Form.Description text={`.${outputFormat} is always lossless. Maximum compression is applied.`} />
        ))}
    </Form>
  );
}
