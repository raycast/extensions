import { Form, ActionPanel, Action, useNavigation, showToast, Toast, Icon } from "@raycast/api";
import { ReactNode, useState } from "react";
import { openFilePicker } from "./NativeFilePicker";
import { validateFile, getFileInfo } from "./FileUtils";

export interface FilePickerProps {
  onFilePicked: (filePath: string) => void;
  title?: string;
  placeholder?: string;
  info?: string;
  submitTitle?: string;
  cancelTitle?: string;
  allowedFileTypes?: string[];
  children?: ReactNode;
}

/**
 * A reusable file picker component that allows users to paste file paths
 * or use the native macOS file picker
 */
export function FilePicker({
  onFilePicked,
  title = "Select File",
  placeholder = "/path/to/your/file",
  info = "Enter the full path to the file",
  submitTitle = "Select",
  cancelTitle = "Cancel",
  allowedFileTypes = [],
  children,
}: FilePickerProps) {
  const { pop } = useNavigation();
  const [filePath, setFilePath] = useState<string>("");

  const handleBrowse = async () => {
    const selectedPath = await openFilePicker({
      prompt: "Select a file",
      allowedFileTypes: allowedFileTypes,
    });

    if (selectedPath && typeof selectedPath === "string") {
      setFilePath(selectedPath);
    }
  };

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitTitle}
            icon={submitTitle.toLowerCase().includes("upload") ? Icon.Upload : Icon.Check}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onSubmit={async (values) => {
              if (values.filePath) {
                // Validate the file before proceeding
                const isValid = await validateFile(values.filePath);
                if (isValid) {
                  onFilePicked(values.filePath);
                  pop();
                }
              }
            }}
          />
          <Action 
            title="Browse..." 
            icon={Icon.Finder} 
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={handleBrowse} 
          />
          <Action title={cancelTitle} icon={Icon.XmarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="filePath"
        title="File Path"
        placeholder={placeholder}
        info={info}
        value={filePath}
        onChange={setFilePath}
        autoFocus
      />
      <Form.Description
        title="Options"
        text="You can either paste a file path or click 'Browse...' to select a file using the native file picker."
      />
      {children}
    </Form>
  );
}

/**
 * A specialized version of FilePicker for uploading files to cloud storage
 */
export function CloudStorageUploader({
  onFilePicked,
  destinationInfo,
  title = "Upload File",
  allowedFileTypes = [],
}: {
  onFilePicked: (filePath: string) => void;
  destinationInfo: string;
  title?: string;
  allowedFileTypes?: string[];
}) {
  return (
    <FilePicker
      onFilePicked={onFilePicked}
      title={title}
      placeholder="/path/to/your/file.txt"
      info="Enter the full path to the file you want to upload or click 'Browse...'"
      submitTitle="Upload"
      cancelTitle="Cancel"
      allowedFileTypes={allowedFileTypes}
    >
      <Form.Description title="Destination" text={destinationInfo} />
    </FilePicker>
  );
} 