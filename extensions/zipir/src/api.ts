import { getPreferenceValues, showToast, Toast, open } from "@raycast/api";

export const APP_URL = "https://app.zipirapp.com";

interface Prefs {
  apiKey: string;
  apiBase?: string;
}

export function apiBase(): string {
  const { apiBase } = getPreferenceValues<Prefs>();
  return (apiBase || "https://api.zipirapp.com").replace(/\/+$/, "");
}

export interface ApiError {
  code?: string;
  message?: string;
  request_id?: string;
}

export class ZipirError extends Error {
  status: number;
  code?: string;
  requestId?: string;

  constructor(status: number, body: unknown) {
    const err = (body as { error?: ApiError })?.error;
    super(err?.message || `Zıpır answered HTTP ${status}`);
    this.status = status;
    this.code = err?.code;
    this.requestId = err?.request_id;
  }
}

/** One call through the documented v1 API. Errors carry Zıpır's own code and message. */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiKey } = getPreferenceValues<Prefs>();
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // A proxy or server error page is HTML: a failed call falls back to the HTTP status below, a successful one is unreadable
    if (res.ok) throw new Error("Zıpır returned an unreadable response");
  }
  if (!res.ok) throw new ZipirError(res.status, body);
  return body as T;
}

export interface Lesson {
  id: string;
  title: string;
  status: "queued" | "rendering" | "done" | "failed";
  phase: string;
  format?: string | null;
  duration_sec?: number | null;
  needs_approval?: boolean;
  created_at?: string;
  error?: string | null;
}

export interface LessonList {
  lessons: Lesson[];
  total: number;
}

export interface Usage {
  key: { id: string; name: string; prefix: string };
  period: { start: string; end: string };
  minutes: { limit: number; used: number; remaining: number; over: boolean };
}

export interface Download {
  url: string;
  expires_in: number;
  variant: string;
  duration_sec?: number | null;
}

export interface Format {
  id: string;
  title?: string;
  description?: string;
}

export async function listLessons(status?: string): Promise<LessonList> {
  const query = status ? `?status=${status}&limit=50` : "?limit=50";
  return request<LessonList>(`/v1/lessons${query}`);
}

export async function getFormats(): Promise<Format[]> {
  const body = await request<{ formats?: Format[] } | Format[]>("/v1/formats");
  return Array.isArray(body) ? body : body.formats || [];
}

export async function getUsage(): Promise<Usage> {
  return request<Usage>("/v1/usage");
}

export async function createLesson(input: { text?: string; url?: string; format?: string }): Promise<{ id: string }> {
  return request<{ id: string }>("/v1/lessons", { method: "POST", body: JSON.stringify(input) });
}

export async function approveLesson(id: string): Promise<void> {
  await request(`/v1/lessons/${id}/approve`, { method: "POST", body: "{}" });
}

export async function downloadLesson(id: string): Promise<Download> {
  return request<Download>(`/v1/lessons/${id}/download`);
}

export async function lessonPlan(id: string): Promise<{ plan?: unknown; storyboard?: unknown }> {
  return request(`/v1/lessons/${id}/plan`);
}

export function lessonUrl(id: string): string {
  return `${APP_URL}/islerim/${id}`;
}

export async function openLesson(id: string): Promise<void> {
  await open(lessonUrl(id));
}

/** A short, human wording for the pipeline phase, instead of the raw enum. */
export function phaseLabel(lesson: Lesson): string {
  if (lesson.status === "failed") return "Failed";
  if (lesson.status === "done") return "Ready";
  if (lesson.needs_approval) return "Waiting for approval";
  switch (lesson.phase) {
    case "reading":
      return "Reading the document";
    case "storyboard_ready":
      return "Storyboard ready";
    case "approved":
      return "Approved, queued";
    case "rendering":
      return "Rendering";
    case "upload":
      return "Uploading";
    case "cancelled":
      return "Cancelled";
    default:
      return lesson.phase || lesson.status;
  }
}

export function formatDuration(sec?: number | null): string {
  if (!sec || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m} min ${String(s).padStart(2, "0")} sec` : `${s} sec`;
}

export function toastFailure(error: unknown): void {
  const message =
    error instanceof ZipirError
      ? [error.message, error.code ? `(${error.code})` : "", error.requestId ? `· ${error.requestId}` : ""].join(" ")
      : error instanceof Error
        ? error.message
        : "Unknown error";
  showToast({ style: Toast.Style.Failure, title: "Zıpır", message });
}
