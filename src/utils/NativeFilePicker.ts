import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { homedir } from "os";

const execPromise = promisify(exec);
const fsWriteFile = promisify(fs.writeFile);
const fsReadFile = promisify(fs.readFile);
const fsUnlink = promisify(fs.unlink);

/**
 * Opens the native macOS file picker dialog using AppleScript
 * but in a way that preserves Raycast's state
 * @param options Configuration options for the file picker
 * @returns Promise resolving to the selected file path or null if canceled
 */
export async function openFilePicker(options: {
  prompt?: string;
  defaultLocation?: string;
  allowedFileTypes?: string[];
  allowMultiple?: boolean;
} = {}): Promise<string | string[] | null> {
  const {
    prompt = "Select a file",
    defaultLocation = "",
    allowedFileTypes = [],
    allowMultiple = false,
  } = options;

  // Create a temporary script file
  const tempScriptPath = path.join(homedir(), ".raycast-temp-script.applescript");
  const tempOutputPath = path.join(homedir(), ".raycast-temp-output.txt");
  
  // Build the AppleScript content
  let scriptContent = `
tell application "System Events"
  activate
  set theFile to choose file with prompt "${prompt}"`;
  
  // Add default location if provided
  if (defaultLocation) {
    scriptContent += ` default location "${defaultLocation}"`;
  }
  
  // Add file type filtering if provided
  if (allowedFileTypes.length > 0) {
    scriptContent += ` of type {${allowedFileTypes.map(type => `"${type}"`).join(", ")}}`;
  }
  
  // Add multiple selection if requested
  if (allowMultiple) {
    scriptContent += ` with multiple selections allowed`;
  }
  
  // Complete the script to write the result to a temp file
  scriptContent += `
  set filePath to POSIX path of theFile
  set fileRef to open for access "${tempOutputPath}" with write permission
  write filePath to fileRef
  close access fileRef
end tell
tell application "Raycast" to activate
`;

  try {
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening file picker...",
    });

    // Write the script to a temporary file
    await fsWriteFile(tempScriptPath, scriptContent);
    
    // Execute the script
    await execPromise(`osascript "${tempScriptPath}"`);
    
    // Read the result from the temp output file
    let result = "";
    try {
      result = (await fsReadFile(tempOutputPath, 'utf8')).trim();
    } catch (error) {
      // If the file doesn't exist or can't be read, the user probably canceled
      loadingToast.hide();
      return null;
    }
    
    // Clean up temp files
    try {
      await fsUnlink(tempScriptPath);
      await fsUnlink(tempOutputPath);
    } catch (error) {
      console.error("Error cleaning up temp files:", error);
    }
    
    loadingToast.hide();
    
    if (!result) {
      return null;
    }
    
    if (allowMultiple) {
      // AppleScript returns multiple paths as a comma-separated list
      return result.split(", ").map(path => path.trim());
    } else {
      return result;
    }
  } catch (error: any) {
    console.error("Error opening file picker:", error);
    
    // Clean up temp files
    try {
      await fsUnlink(tempScriptPath);
      await fsUnlink(tempOutputPath);
    } catch (cleanupError) {
      console.error("Error cleaning up temp files:", cleanupError);
    }
    
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to open file picker",
      message: error.message,
    });
    
    return null;
  }
}

/**
 * Opens the native macOS folder picker dialog using AppleScript
 * but in a way that preserves Raycast's state
 * @param options Configuration options for the folder picker
 * @returns Promise resolving to the selected folder path or null if canceled
 */
export async function openFolderPicker(options: {
  prompt?: string;
  defaultLocation?: string;
} = {}): Promise<string | null> {
  const {
    prompt = "Select a folder",
    defaultLocation = "",
  } = options;

  // Create a temporary script file
  const tempScriptPath = path.join(homedir(), ".raycast-temp-script.applescript");
  const tempOutputPath = path.join(homedir(), ".raycast-temp-output.txt");
  
  // Build the AppleScript content
  let scriptContent = `
tell application "System Events"
  activate
  set theFolder to choose folder with prompt "${prompt}"`;
  
  // Add default location if provided
  if (defaultLocation) {
    scriptContent += ` default location "${defaultLocation}"`;
  }
  
  // Complete the script to write the result to a temp file
  scriptContent += `
  set folderPath to POSIX path of theFolder
  set fileRef to open for access "${tempOutputPath}" with write permission
  write folderPath to fileRef
  close access fileRef
end tell
tell application "Raycast" to activate
`;

  try {
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening folder picker...",
    });

    // Write the script to a temporary file
    await fsWriteFile(tempScriptPath, scriptContent);
    
    // Execute the script
    await execPromise(`osascript "${tempScriptPath}"`);
    
    // Read the result from the temp output file
    let result = "";
    try {
      result = (await fsReadFile(tempOutputPath, 'utf8')).trim();
    } catch (error) {
      // If the file doesn't exist or can't be read, the user probably canceled
      loadingToast.hide();
      return null;
    }
    
    // Clean up temp files
    try {
      await fsUnlink(tempScriptPath);
      await fsUnlink(tempOutputPath);
    } catch (error) {
      console.error("Error cleaning up temp files:", error);
    }
    
    loadingToast.hide();
    
    return result || null;
  } catch (error: any) {
    console.error("Error opening folder picker:", error);
    
    // Clean up temp files
    try {
      await fsUnlink(tempScriptPath);
      await fsUnlink(tempOutputPath);
    } catch (cleanupError) {
      console.error("Error cleaning up temp files:", cleanupError);
    }
    
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to open folder picker",
      message: error.message,
    });
    
    return null;
  }
}

/**
 * Opens the native macOS save file dialog using AppleScript
 * but in a way that preserves Raycast's state
 * @param options Configuration options for the save dialog
 * @returns Promise resolving to the selected save path or null if canceled
 */
export async function openSaveDialog(options: {
  prompt?: string;
  defaultName?: string;
  defaultLocation?: string;
  fileType?: string;
} = {}): Promise<string | null> {
  const {
    prompt = "Save as",
    defaultName = "Untitled",
    defaultLocation = "",
    fileType = "",
  } = options;

  // Create a temporary script file
  const tempScriptPath = path.join(homedir(), ".raycast-temp-script.applescript");
  const tempOutputPath = path.join(homedir(), ".raycast-temp-output.txt");
  
  // Build the AppleScript content
  let scriptContent = `
tell application "System Events"
  activate
  set savePath to choose file name with prompt "${prompt}" default name "${defaultName}"`;
  
  // Add default location if provided
  if (defaultLocation) {
    scriptContent += ` default location "${defaultLocation}"`;
  }
  
  // Complete the script to write the result to a temp file
  scriptContent += `
  set savePath to POSIX path of savePath
  set fileRef to open for access "${tempOutputPath}" with write permission
  write savePath to fileRef
  close access fileRef
end tell
tell application "Raycast" to activate
`;

  try {
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening save dialog...",
    });

    // Write the script to a temporary file
    await fsWriteFile(tempScriptPath, scriptContent);
    
    // Execute the script
    await execPromise(`osascript "${tempScriptPath}"`);
    
    // Read the result from the temp output file
    let result = "";
    try {
      result = (await fsReadFile(tempOutputPath, 'utf8')).trim();
    } catch (error) {
      // If the file doesn't exist or can't be read, the user probably canceled
      loadingToast.hide();
      return null;
    }
    
    // Clean up temp files
    try {
      await fsUnlink(tempScriptPath);
      await fsUnlink(tempOutputPath);
    } catch (error) {
      console.error("Error cleaning up temp files:", error);
    }
    
    loadingToast.hide();
    
    if (!result) {
      return null;
    }
    
    // Add file extension if needed
    if (fileType && !result.endsWith(`.${fileType}`)) {
      result += `.${fileType}`;
    }
    
    return result;
  } catch (error: any) {
    console.error("Error opening save dialog:", error);
    
    // Clean up temp files
    try {
      await fsUnlink(tempScriptPath);
      await fsUnlink(tempOutputPath);
    } catch (cleanupError) {
      console.error("Error cleaning up temp files:", cleanupError);
    }
    
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to open save dialog",
      message: error.message,
    });
    
    return null;
  }
} 