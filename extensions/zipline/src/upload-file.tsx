import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  getSelectedFinderItems,
  Icon,
  Clipboard,
} from "@raycast/api";
import fs from "fs";
import { useState, useEffect } from "react";
import { createZiplineClient } from "./utils/preferences";
import { UploadOptions } from "./types/zipline";

interface FormValues {
  files: string[];
  format: "RANDOM" | "DATE" | "UUID" | "GFYCAT" | "NAME";
  originalName: boolean;
  password: string;
  embed: boolean;
  maxViews: string;
  expiresAt: string;
}

export default function UploadFile() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const ziplineClient = createZiplineClient();

  useEffect(() => {
    async function loadSelectedFiles() {
      try {
        const finderItems = await getSelectedFinderItems();
        const filePaths = finderItems
          .filter((item) => {
            try {
              const stats = fs.statSync(item.path);
              return stats.isFile();
            } catch {
              return false;
            }
          })
          .map((item) => item.path);

        setSelectedFiles(filePaths);
      } catch {
        // No files selected in Finder, that's okay
      }
    }

    loadSelectedFiles();
  }, []);

  const handleSubmit = async (values: FormValues) => {
    if (values.files.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
        message: "Please select at least one file to upload",
      });
      return;
    }

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const filePath of values.files) {
        const fileName = filePath.split("/").pop() || "unknown";

        const options: Partial<UploadOptions> = {
          format: values.format,
          originalName: values.originalName,
          embed: values.embed,
        };

        if (values.password.trim()) {
          options.password = values.password.trim();
        }

        if (values.maxViews.trim()) {
          const maxViews = parseInt(values.maxViews.trim(), 10);
          if (!isNaN(maxViews) && maxViews > 0) {
            options.maxViews = maxViews;
          }
        }

        if (values.expiresAt.trim()) {
          options.expiresAt = values.expiresAt.trim();
        }

        const response = await ziplineClient.uploadFile(
          filePath,
          fileName,
          options,
        );

        if (Array.isArray(response.files) && response.files.length > 0) {
          uploadedUrls.push(response.files[0].url);
        }
      }

      if (uploadedUrls.length === 1) {
        await Clipboard.copy(uploadedUrls[0]);
        showToast({
          style: Toast.Style.Success,
          title: "File uploaded successfully",
          message: "URL copied to clipboard",
        });
      } else if (uploadedUrls.length > 1) {
        await Clipboard.copy(uploadedUrls.join("\n"));
        showToast({
          style: Toast.Style.Success,
          title: `${uploadedUrls.length} files uploaded successfully`,
          message: "URLs copied to clipboard",
        });
      }

      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Upload failed",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Upload Files"
            icon={Icon.Upload}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
      isLoading={uploading}
    >
      <Form.FilePicker
        id="files"
        title="Files to Upload"
        allowMultipleSelection={true}
        canChooseDirectories={false}
        defaultValue={selectedFiles}
      />

      <Form.Separator />

      <Form.Dropdown
        id="format"
        title="Filename Format"
        defaultValue="RANDOM"
        info="How the filename should be generated on the server"
      >
        <Form.Dropdown.Item value="RANDOM" title="Random" icon="🎲" />
        <Form.Dropdown.Item value="DATE" title="Date-based" icon="📅" />
        <Form.Dropdown.Item value="UUID" title="UUID" icon="🔑" />
        <Form.Dropdown.Item value="GFYCAT" title="Gfycat-style" icon="🐱" />
        <Form.Dropdown.Item value="NAME" title="Original filename" icon="📝" />
      </Form.Dropdown>

      <Form.Checkbox
        id="originalName"
        title="Preserve Original Name"
        label="Keep the original filename alongside generated name"
        info="The original filename will be stored for reference"
      />

      <Form.Separator />

      <Form.TextField
        id="password"
        title="Password (Optional)"
        placeholder="Enter password to protect the file"
        info="If set, users will need this password to access the file"
      />

      <Form.TextField
        id="maxViews"
        title="Max Views (Optional)"
        placeholder="e.g., 10"
        info="Maximum number of times the file can be viewed before being deleted"
      />

      <Form.TextField
        id="expiresAt"
        title="Expires At (Optional)"
        placeholder="YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS"
        info="When the file should expire and be automatically deleted"
      />

      <Form.Checkbox
        id="embed"
        title="Embed"
        label="Generate embed metadata for rich previews"
        info="Useful for sharing on social media and chat platforms"
      />
    </Form>
  );
}
