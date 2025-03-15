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

/**
 * Formats a timestamp into a human-readable date and time
 * @param timestamp ISO timestamp string
 * @returns Formatted date and time string
 */
export function formatTimestamp(timestamp: string): string {
  if (!timestamp) return "Unknown";
  try {
    return new Date(timestamp).toLocaleString();
  } catch (e) {
    return timestamp;
  }
}

/**
 * Formats a generation ID to be more readable
 * @param generation The generation ID string
 * @returns Formatted generation ID
 */
export function formatGeneration(generation: string): string {
  if (!generation) return "Unknown";
  // Shorten the generation ID for display purposes
  return generation.length > 12 ? `${generation.substring(0, 6)}...${generation.substring(generation.length - 6)}` : generation;
}

/**
 * Determines if an object is the current version
 * @param object The storage object
 * @returns True if it's the current version
 */
export function isCurrentVersion(object: any): boolean {
  return object.timeDeleted === undefined;
}

/**
 * Calculates the age of an object version
 * @param timestamp ISO timestamp string
 * @returns Human-readable age string
 */
export function calculateAge(timestamp: string): string {
  if (!timestamp) return "Unknown";
  
  try {
    const created = new Date(timestamp).getTime();
    const now = new Date().getTime();
    const diff = now - created;
    
    // Convert to appropriate time unit
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`;
    
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;
    
    const years = Math.floor(months / 12);
    return `${years} year${years !== 1 ? 's' : ''}`;
  } catch (e) {
    return "Unknown";
  }
} 