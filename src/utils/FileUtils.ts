import { showToast, Toast } from "@raycast/api";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const fsExists = promisify(fs.exists);
const fsMkdir = promisify(fs.mkdir);
const fsReaddir = promisify(fs.readdir);
const fsStat = promisify(fs.stat);

/**
 * Ensures that a directory exists, creating it if necessary
 * @param dirPath The directory path to ensure exists
 * @returns A promise that resolves when the directory exists
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    const exists = await fsExists(dirPath);
    if (!exists) {
      await fsMkdir(dirPath, { recursive: true });
    }
  } catch (error: any) {
    console.error(`Error ensuring directory exists: ${dirPath}`, error);
    throw new Error(`Failed to create directory: ${error.message}`);
  }
}

/**
 * Formats a file size in bytes to a human-readable string
 * @param bytes The size in bytes
 * @returns A formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Guesses the content type of a file based on its extension
 * @param filename The filename to analyze
 * @returns The guessed MIME type
 */
export function guessContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || "";
  
  const contentTypeMap: Record<string, string> = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "svg": "image/svg+xml",
    "webp": "image/webp",
    "txt": "text/plain",
    "html": "text/html",
    "css": "text/css",
    "js": "application/javascript",
    "json": "application/json",
    "xml": "application/xml",
    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "zip": "application/zip",
    "rar": "application/x-rar-compressed",
    "tar": "application/x-tar",
    "gz": "application/gzip",
    "mp3": "audio/mpeg",
    "mp4": "video/mp4",
    "avi": "video/x-msvideo",
    "mov": "video/quicktime",
    "webm": "video/webm"
  };
  
  return contentTypeMap[ext] || "application/octet-stream";
}

/**
 * Validates if a file exists and is accessible
 * @param filePath The path to the file to validate
 * @returns A promise that resolves to true if the file exists and is accessible
 */
export async function validateFile(filePath: string): Promise<boolean> {
  try {
    const exists = await fsExists(filePath);
    if (!exists) {
      showToast({
        style: Toast.Style.Failure,
        title: "File not found",
        message: `The file "${filePath}" does not exist.`,
      });
      return false;
    }
    
    const stats = await fsStat(filePath);
    if (!stats.isFile()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Not a file",
        message: `"${filePath}" is not a file.`,
      });
      return false;
    }
    
    return true;
  } catch (error: any) {
    console.error(`Error validating file: ${filePath}`, error);
    showToast({
      style: Toast.Style.Failure,
      title: "Error accessing file",
      message: error.message,
    });
    return false;
  }
}

/**
 * Gets file information
 * @param filePath The path to the file
 * @returns A promise that resolves to an object with file information
 */
export async function getFileInfo(filePath: string): Promise<{
  name: string;
  size: number;
  formattedSize: string;
  extension: string;
  contentType: string;
  lastModified: Date;
} | null> {
  try {
    const exists = await validateFile(filePath);
    if (!exists) return null;
    
    const stats = await fsStat(filePath);
    const name = path.basename(filePath);
    const extension = path.extname(filePath).slice(1).toLowerCase();
    
    return {
      name,
      size: stats.size,
      formattedSize: formatFileSize(stats.size),
      extension,
      contentType: guessContentType(name),
      lastModified: stats.mtime,
    };
  } catch (error) {
    console.error(`Error getting file info: ${filePath}`, error);
    return null;
  }
} 