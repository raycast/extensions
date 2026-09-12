import { getPreferenceValues } from "@raycast/api";
import {
  ZeaburEmailPayload,
  ZeaburEmailResponse,
  ZeaburEmailScheduleResponse,
  ZeaburEmailErrorResponse,
} from "../type";

const BASE_URL = "https://api.zeabur.com/api/v1/zsend";

function getEmailApiKey(): string {
  const preferences = getPreferenceValues<{ zeaburEmailApiKey: string }>();
  return preferences.zeaburEmailApiKey;
}

class ZeaburEmailError extends Error {
  statusCode: number;
  apiError: string;
  apiMessage?: string;

  constructor(statusCode: number, apiError: string, apiMessage?: string) {
    const displayMessage = apiMessage || apiError;
    super(displayMessage);
    this.name = "ZeaburEmailError";
    this.statusCode = statusCode;
    this.apiError = apiError;
    this.apiMessage = apiMessage;
  }
}

async function handleErrorResponse(res: { status: number; json: () => Promise<unknown> }): Promise<never> {
  let errorData: ZeaburEmailErrorResponse;
  try {
    errorData = (await res.json()) as ZeaburEmailErrorResponse;
  } catch {
    errorData = { error: `HTTP ${res.status}` };
  }

  switch (res.status) {
    case 400:
      throw new ZeaburEmailError(400, errorData.error, errorData.message || "Invalid request parameters");
    case 401:
      throw new ZeaburEmailError(
        401,
        errorData.error,
        "Invalid or missing API key. Please check your Email API Key in command preferences.",
      );
    case 403:
      throw new ZeaburEmailError(403, errorData.error, errorData.message || "Permission denied");
    case 429:
      throw new ZeaburEmailError(429, errorData.error, errorData.message || "Daily quota exceeded");
    default:
      throw new ZeaburEmailError(res.status, errorData.error, errorData.message || "An unexpected error occurred");
  }
}

export async function sendEmail(payload: ZeaburEmailPayload): Promise<ZeaburEmailResponse> {
  const apiKey = getEmailApiKey();

  let res;
  try {
    res = await fetch(`${BASE_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(`Network error: ${error instanceof Error ? error.message : "Please check your connection"}`);
  }

  if (!res.ok) {
    await handleErrorResponse(res);
  }

  return (await res.json()) as ZeaburEmailResponse;
}

export async function scheduleEmail(payload: ZeaburEmailPayload): Promise<ZeaburEmailScheduleResponse> {
  const apiKey = getEmailApiKey();

  if (!payload.scheduled_at) {
    throw new Error("scheduled_at is required for scheduling an email");
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}/emails/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(`Network error: ${error instanceof Error ? error.message : "Please check your connection"}`);
  }

  if (!res.ok) {
    await handleErrorResponse(res);
  }

  return (await res.json()) as ZeaburEmailScheduleResponse;
}
