import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  convertMedia,
  checkExtensionType,
  OUTPUT_VIDEO_EXTENSIONS,
  OUTPUT_AUDIO_EXTENSIONS,
  OUTPUT_IMAGE_EXTENSIONS,
  OUTPUT_ALL_EXTENSIONS,
} from "../utils/converter";
import { execPromise } from "../utils/exec";

export function ConverterForm({ initialFiles = [] }: { initialFiles?: string[] }) {
  const [selectedFileType, setSelectedFileType] = useState<"video" | "image" | "audio" | null>(null);
  const [currentFiles, setCurrentFiles] = useState<string[]>(initialFiles || []);
  const [outputFormat, setOutputFormat] = useState<(typeof OUTPUT_ALL_EXTENSIONS)[number] | null>(null);
  // TODO: Proper type for quality setting? Maybe split the quality setting into a union type for each format?
  // Currently represents 0-100 in steps of 5 for jpg heic avif webp, "lossless" for webp, "lzw" or "deflate" for tiff
  const [currentQualitySetting, setCurrentQualitySetting] = useState<string>("");

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      handleFileSelect(initialFiles);
    }
  }, [initialFiles]);

  const handleFileSelect = (files: string[]) => {
    if (files.length === 0) {
      setCurrentFiles([]);
      setSelectedFileType(null);
      return;
    }

    try {
      let primaryFileType: "video" | "image" | "audio" | false = false;
      for (const file of files) {
        const type = checkExtensionType(file);
        if (type) {
          primaryFileType = type as "video" | "image" | "audio";
          break; // Found the first valid file type
        }
      }

      if (!primaryFileType) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid selection",
          message: "No valid media files selected. Please select video, image, or audio files.",
        });
        setCurrentFiles([]);
        setSelectedFileType(null);
        return;
      }

      const processedFiles = files.filter((file) => {
        return checkExtensionType(file) === primaryFileType;
      });

      if (processedFiles.length < files.length) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid files in selection",
          message: `Kept ${processedFiles.length} ${primaryFileType} file(s). ${files.length - processedFiles.length} other file(s) from your selection were invalid or of a different type and have been discarded.`, // Updated message
        });
      }

      setCurrentFiles(processedFiles);
      setSelectedFileType(primaryFileType);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error processing files",
        message: String(error),
      });
      setCurrentFiles([]);
      setSelectedFileType(null);
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

    const toast = await showToast({ style: Toast.Style.Animated, title: "Converting file..." });

    for (const item of currentFiles) {
      try {
        let outputPath: string;
        if (selectedFileType === "image") {
          outputPath = await convertMedia(
            item,
            outputFormat as (typeof OUTPUT_IMAGE_EXTENSIONS)[number],
            currentQualitySetting,
          );
        } else if (selectedFileType === "audio") {
          outputPath = await convertMedia(item, outputFormat as (typeof OUTPUT_AUDIO_EXTENSIONS)[number]);
        } else {
          outputPath = await convertMedia(item, outputFormat as (typeof OUTPUT_VIDEO_EXTENSIONS)[number]);
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
          defaultValue={selectedFileType === "image" ? ".jpg" : selectedFileType === "audio" ? ".mp3" : ".mp4"}
          onChange={(newFormat) => {
            setOutputFormat(newFormat as (typeof OUTPUT_ALL_EXTENSIONS)[number]);
          }}
        >
          {selectedFileType === "image" ? (
            <Form.Dropdown.Section title="Image Formats">
              {OUTPUT_IMAGE_EXTENSIONS.map((format) => (
                <Form.Dropdown.Item key={format} value={format} title={format} />
              ))}
            </Form.Dropdown.Section>
          ) : selectedFileType === "audio" ? (
            <Form.Dropdown.Section title="Audio Formats">
              {OUTPUT_AUDIO_EXTENSIONS.map((format) => (
                <Form.Dropdown.Item key={format} value={format} title={format} />
              ))}
            </Form.Dropdown.Section>
          ) : (
            <Form.Dropdown.Section title="Video Formats">
              {OUTPUT_VIDEO_EXTENSIONS.map((format) => (
                <Form.Dropdown.Item key={format} value={format} title={format} />
              ))}
            </Form.Dropdown.Section>
          )}
        </Form.Dropdown>
      )}
      {selectedFileType === "image" &&
        outputFormat &&
        (OUTPUT_IMAGE_EXTENSIONS as ReadonlyArray<string>).includes(outputFormat) &&
        (outputFormat !== ".png" ? (
          <>
            <Form.Dropdown
              id="qualitySetting"
              title={`Select quality`}
              defaultValue="80"
              onChange={setCurrentQualitySetting}
            >
              {outputFormat === ".webp" && (
                <Form.Dropdown.Section>
                  <Form.Dropdown.Item value="lossless" title="Lossless" />
                </Form.Dropdown.Section>
              )}
              <Form.Dropdown.Section>
                {outputFormat !== ".tiff" ? (
                  [...Array(21).keys()].map((i) => {
                    const q = 100 - i * 5;
                    const value = q.toString();
                    const title = outputFormat === ".avif" && q === 100 ? `100 (lossless)` : value;

                    return <Form.Dropdown.Item key={`${outputFormat}-q-${q}`} value={value} title={title} />;
                  })
                ) : (
                  <>
                    <Form.Dropdown.Item value="deflate" title="Deflate (recommended, smaller size)" />
                    <Form.Dropdown.Item value="lzw" title="LZW (wider compatibility)" />
                  </>
                )}
              </Form.Dropdown.Section>
            </Form.Dropdown>
            {outputFormat === ".tiff" ? <Form.Description text={`Here, .tiff is always lossless.`} /> : ""}
          </>
        ) : (
          <Form.Description text={`.png is always lossless. Maximum compression is applied.`} />
        ))}
    </Form>
  );
}
