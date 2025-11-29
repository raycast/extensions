import {
  showToast,
  Toast,
  getSelectedFinderItems,
  Form,
  ActionPanel,
  Action,
  useNavigation,
  Detail,
} from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { useState, useEffect } from "react";
import { getImageMetadata, checkOiiotoolInstalled } from "./utils";

const execAsync = promisify(exec);

const FORMATS: Record<
  string,
  { title: string; compressions: { value: string; title: string }[] }
> = {
  exr: {
    title: "EXR",
    compressions: [
      { value: "dwaa", title: "DWAA" },
      { value: "dwab", title: "DWAB" },
      { value: "zip", title: "Zip" },
      { value: "zips", title: "Zips" },
      { value: "rle", title: "RLE" },
      { value: "piz", title: "PIZ" },
      { value: "pxr24", title: "PXR24" },
      { value: "b44", title: "B44" },
      { value: "b44a", title: "B44A" },
      { value: "none", title: "None" },
    ],
  },
  jpg: {
    title: "JPG",
    compressions: [
      { value: "jpeg:100", title: "Best (100)" },
      { value: "jpeg:90", title: "High (90)" },
      { value: "jpeg:80", title: "Good (80)" },
      { value: "jpeg:50", title: "Medium (50)" },
      { value: "jpeg:20", title: "Low (20)" },
    ],
  },
  png: {
    title: "PNG",
    compressions: [
      { value: "zip", title: "Zip" },
      { value: "none", title: "None" },
    ],
  },
  tiff: {
    title: "TIFF",
    compressions: [
      { value: "lzw", title: "LZW" },
      { value: "zip", title: "Zip" },
      { value: "none", title: "None" },
      { value: "packbits", title: "Packbits" },
    ],
  },
  tx: {
    title: "TX (Arnold)",
    compressions: [
      { value: "zip", title: "Zip (Default)" },
      { value: "none", title: "None" },
      { value: "lzw", title: "LZW" },
    ],
  },
};

const RESIZE_MODES = [
  { value: "none", title: "None" },
  { value: "scale", title: "Scale Percentage" },
  { value: "width", title: "Set Width" },
  { value: "height", title: "Set Height" },
  { value: "fit", title: "Set Longest Side" },
];

const FILTER_OPTIONS = [
  { value: "lanczos3", title: "Lanczos3" },
  { value: "cubic", title: "Cubic" },
  { value: "box", title: "Box" },
  { value: "triangle", title: "Triangle" },
];

interface FormValues {
  format: string;
  compression: string;
  addSuffix: boolean;
  resizeMode: string;
  resizeValue: string;
  resizeFilter: string;
  addResolutionSuffix: boolean;
  compressionLevel?: string;
}

export default function Command() {
  const { pop } = useNavigation();
  const [selectedFormat, setSelectedFormat] = useState<string>("exr");
  const [hasOiiotool, setHasOiiotool] = useState<boolean | null>(null);
  const [resizeMode, setResizeMode] = useState<string>("none");
  const [compressionLevel, setCompressionLevel] = useState<string>("45");
  const [selectedCompression, setSelectedCompression] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function check() {
    setIsLoading(true);
    const installed = await checkOiiotoolInstalled();
    setHasOiiotool(installed);
    setIsLoading(false);
    if (!installed) {
      await showToast({
        style: Toast.Style.Failure,
        title: "OIIO Tool not found",
        message: "Please install OpenImageIO to use this extension.",
      });
    }
  }

  useEffect(() => {
    check();
  }, []);

  useEffect(() => {
    if (FORMATS[selectedFormat]) {
      setSelectedCompression(FORMATS[selectedFormat].compressions[0].value);
    }
  }, [selectedFormat]);

  if (isLoading) {
    return <Detail markdown="Loading..." />;
  }

  if (hasOiiotool === false) {
    const markdown = `
# 🛠️ Setup Required

**EXR Converter** relies on the powerful **OpenImageIO** library to process your images. 

It looks like it's not installed on your system yet. No worries, it's easy to fix!

### How to Install

1.  Copy the command below.
2.  Paste it into your Terminal and hit Enter.
3.  Come back here and click **Check Again**.

\`\`\`bash
brew install openimageio
\`\`\`
`;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Install Command"
              content="brew install openimageio"
            />
            <Action title="Check Again" onAction={check} />
          </ActionPanel>
        }
      />
    );
  }

  async function handleSubmit(values: FormValues) {
    try {
      const items = await getSelectedFinderItems();

      if (items.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No files selected",
          message: "Please select image files in Finder",
        });
        return;
      }

      await showToast({
        style: Toast.Style.Animated,
        title: "Converting images...",
        message: `${items.length} file(s) selected`,
      });

      for (const item of items) {
        const inputPath = item.path;
        const parsedPath = path.parse(inputPath);

        // Get metadata for resizing calculations
        const metadata = await getImageMetadata(inputPath);
        let targetWidth = metadata.width;
        let targetHeight = metadata.height;
        let resizeArgs = "";

        // Calculate new dimensions
        if (values.resizeMode !== "none" && values.resizeValue) {
          const val = parseFloat(values.resizeValue);
          if (!isNaN(val)) {
            if (values.resizeMode === "scale") {
              const scale = val / 100;
              targetWidth = Math.round(metadata.width * scale);
              targetHeight = Math.round(metadata.height * scale);
              resizeArgs = `--resize:filter=${values.resizeFilter} ${targetWidth}x${targetHeight}`;
            } else if (values.resizeMode === "width") {
              targetWidth = Math.round(val);
              targetHeight = Math.round(
                metadata.height * (targetWidth / metadata.width),
              );
              resizeArgs = `--resize:filter=${values.resizeFilter} ${targetWidth}x0`;
            } else if (values.resizeMode === "height") {
              targetHeight = Math.round(val);
              targetWidth = Math.round(
                metadata.width * (targetHeight / metadata.height),
              );
              resizeArgs = `--resize:filter=${values.resizeFilter} 0x${targetHeight}`;
            } else if (values.resizeMode === "fit") {
              // Fit within box (Set Longest Side)
              const ratio = Math.min(
                val / metadata.width,
                val / metadata.height,
              );
              targetWidth = Math.round(metadata.width * ratio);
              targetHeight = Math.round(metadata.height * ratio);
              resizeArgs = `--fit:filter=${values.resizeFilter} ${val}x${val}`;
            }
          }
        }

        // Determine output filename
        let filename = parsedPath.name;
        if (values.addSuffix) {
          filename += `_${values.compression.replace(/:/g, "-")}`;
        }
        if (values.addResolutionSuffix) {
          filename += `_${targetWidth}x${targetHeight}`;
        }

        const outputExtension = `.${values.format}`;
        const outputPath = path.join(
          parsedPath.dir,
          `${filename}${outputExtension}`,
        );

        // Construct oiiotool command
        // oiiotool <input> [resize] -compression <type> -o <output>
        // Note: For JPG, compression usually maps to quality, but oiiotool uses -compression jpeg.
        // If we wanted to control quality we'd use --quality <n> but for now we stick to compression types.
        let compressionArg = "";
        if (values.compression !== "none") {
          compressionArg = `-compression ${values.compression}`;

          // Append compression level for DWAA/DWAB if specified
          if (
            values.format === "exr" &&
            (values.compression === "dwaa" || values.compression === "dwab")
          ) {
            const level = parseFloat(values.compressionLevel || "45");
            if (!isNaN(level)) {
              compressionArg += `:${level}`;
            }
          }
        }

        let outputArg = `-o "${outputPath}"`;
        if (values.format === "tx") {
          outputArg = `-otex "${outputPath}"`;
        }

        const command = `oiiotool "${inputPath}" ${resizeArgs} ${compressionArg} ${outputArg}`;

        try {
          await execAsync(command, {
            env: {
              ...process.env,
              PATH: `/opt/homebrew/bin:${process.env.PATH}`,
            },
          });
        } catch (e: unknown) {
          const error = e as { stderr?: string; message?: string };
          const errorMessage = error.stderr || error.message || "Unknown error";

          // Check for common dependency/library issues
          if (
            errorMessage.includes("Library not loaded") ||
            errorMessage.includes("dyld")
          ) {
            throw new Error(
              `OpenImageIO dependency issue detected. Please reinstall OpenImageIO:\n\nbrew reinstall openimageio\n\nOriginal error: ${errorMessage}`,
            );
          }

          throw new Error(
            `Failed to convert ${parsedPath.base}: ${errorMessage}`,
          );
        }
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Conversion complete",
        message: `Converted ${items.length} file(s) to ${FORMATS[values.format].title}`,
      });

      pop(); // Close the form after success
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Conversion failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert Images" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="format"
        title="Output Format"
        value={selectedFormat}
        onChange={setSelectedFormat}
      >
        {Object.entries(FORMATS).map(([key, format]) => (
          <Form.Dropdown.Item key={key} value={key} title={format.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="compression"
        title="Compression"
        value={selectedCompression}
        onChange={setSelectedCompression}
      >
        {FORMATS[selectedFormat].compressions.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.Dropdown>

      {selectedFormat === "exr" &&
        (selectedCompression === "dwaa" || selectedCompression === "dwab") && (
          <Form.Dropdown
            id="compressionLevel"
            title="Compression Level"
            value={compressionLevel}
            onChange={setCompressionLevel}
            info="Lower values = higher quality, larger file size. Default is 45."
          >
            <Form.Dropdown.Item value="10" title="10 (High Quality)" />
            <Form.Dropdown.Item value="20" title="20" />
            <Form.Dropdown.Item value="30" title="30" />
            <Form.Dropdown.Item value="40" title="40" />
            <Form.Dropdown.Item value="45" title="45 (Default)" />
            <Form.Dropdown.Item value="50" title="50" />
            <Form.Dropdown.Item value="60" title="60" />
            <Form.Dropdown.Item value="70" title="70" />
            <Form.Dropdown.Item value="80" title="80" />
            <Form.Dropdown.Item value="90" title="90" />
            <Form.Dropdown.Item value="100" title="100 (Low Quality)" />
          </Form.Dropdown>
        )}

      <Form.Separator />

      <Form.Dropdown
        id="resizeMode"
        title="Resize Mode"
        value={resizeMode}
        onChange={setResizeMode}
      >
        {RESIZE_MODES.map((mode) => (
          <Form.Dropdown.Item
            key={mode.value}
            value={mode.value}
            title={mode.title}
          />
        ))}
      </Form.Dropdown>

      {resizeMode !== "none" && (
        <>
          <Form.TextField
            id="resizeValue"
            title="Value"
            placeholder="Percentage or Pixels"
          />

          <Form.Dropdown
            id="resizeFilter"
            title="Filter"
            defaultValue="lanczos3"
          >
            {FILTER_OPTIONS.map((filter) => (
              <Form.Dropdown.Item
                key={filter.value}
                value={filter.value}
                title={filter.title}
              />
            ))}
          </Form.Dropdown>
        </>
      )}

      <Form.Separator />

      <Form.Checkbox
        id="addSuffix"
        label="Add Compression Type to File Name"
        defaultValue={false}
      />
      <Form.Checkbox
        id="addResolutionSuffix"
        label="Add Resolution to File Name"
        defaultValue={false}
      />
    </Form>
  );
}
