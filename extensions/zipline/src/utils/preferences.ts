import { getPreferenceValues } from "@raycast/api";
import { ZiplinePreferences } from "../types/zipline";
import { ZiplineAPI } from "../api/zipline";

export function getPreferences(): ZiplinePreferences {
  return getPreferenceValues<ZiplinePreferences>();
}

export function createZiplineClient(): ZiplineAPI {
  const preferences = getPreferences();
  return new ZiplineAPI(preferences.ziplineUrl, preferences.apiToken);
}

export function getPageSize(): number {
  const preferences = getPreferences();
  const pageSize = parseInt(preferences.pageSize || "20", 10);
  return isNaN(pageSize) ? 20 : Math.max(1, Math.min(100, pageSize));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return (
    date.toLocaleDateString() +
    " " +
    date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

export function getMimeTypeIcon(mimetype: string): string {
  if (mimetype.startsWith("image/")) return "🖼️";
  if (mimetype.startsWith("video/")) return "🎥";
  if (mimetype.startsWith("audio/")) return "🎵";
  if (mimetype.startsWith("application/pdf")) return "📄";
  if (mimetype.includes("text/")) return "📝";
  if (
    mimetype.includes("application/zip") ||
    mimetype.includes("application/x-rar")
  )
    return "📦";
  return "📁";
}
