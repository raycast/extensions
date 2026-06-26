import { getOAuthToken } from "../components/withZoomAuth";
import { mergeMeetingResponses, type MeetingListResponse } from "./meetingResponses";

type BaseMeeting = {
  id: string;
  duration: number;
  join_url: string;
  topic: string;
  timezone: string;
  agenda: string;
  uuid: string;
};

export type ScheduledMeeting = BaseMeeting & {
  type: 1 | 2 | 8;
  start_time: string;
};

export type RecurringMeetingWithNoFixedTime = BaseMeeting & {
  type: 3;
};

export type Meeting = ScheduledMeeting | RecurringMeetingWithNoFixedTime;
export type { timezone } from "./timezones";

const MEETING_LIST_RETRY_ATTEMPTS = 3;
const MEETING_LIST_RETRY_DELAY_MS = 1_000;

type ZoomRequestOptions = {
  method?: "POST" | "PATCH" | "DELETE";
  payload?: unknown;
  token?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(response: Awaited<ReturnType<typeof fetch>>, attempt: number) {
  const retryAfter = response.headers.get("Retry-After");

  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds)) {
      return seconds * 1_000;
    }
  }

  return MEETING_LIST_RETRY_DELAY_MS * attempt;
}

function getZoomRequestHeaders(token = getOAuthToken(), includeJsonContentType = false) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (includeJsonContentType) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

async function fetchZoomApi(url: string, errorPrefix: string, options: ZoomRequestOptions = {}) {
  const hasPayload = options.payload !== undefined;
  const response = await fetch(url, {
    method: options.method,
    headers: getZoomRequestHeaders(options.token, hasPayload),
    body: hasPayload ? JSON.stringify(options.payload) : undefined,
  });

  if (!response.ok) {
    console.error(`${errorPrefix} error: ${await response.text()}`);
    throw new Error(response.statusText);
  }

  return response;
}

async function fetchMeetingList(url: string, errorPrefix: string) {
  for (let attempt = 1; attempt <= MEETING_LIST_RETRY_ATTEMPTS; attempt++) {
    const response = await fetch(url, {
      headers: getZoomRequestHeaders(),
    });

    if (response.ok) {
      return (await response.json()) as MeetingListResponse;
    }

    if (response.status === 429 && attempt < MEETING_LIST_RETRY_ATTEMPTS) {
      const delayMs = getRetryDelayMs(response, attempt);
      await response.text();
      await sleep(delayMs);
      continue;
    }

    console.error(`${errorPrefix} error: ${await response.text()}`);
    throw new Error(response.statusText);
  }

  throw new Error(`${errorPrefix} failed after ${MEETING_LIST_RETRY_ATTEMPTS} attempts`);
}

let upcomingMeetingsPromise: Promise<MeetingListResponse> | undefined;

async function fetchUpcomingMeetings() {
  const hostedMeetingsResponse = await fetchMeetingList(
    "https://api.zoom.us/v2/users/me/meetings?type=upcoming&page_size=300",
    "Fetch meetings",
  );

  try {
    const invitedMeetingsResponse = await fetchMeetingList(
      "https://api.zoom.us/v2/users/me/upcoming_meetings",
      "Fetch upcoming meetings",
    );

    if (Array.isArray(invitedMeetingsResponse.meetings)) {
      return mergeMeetingResponses(hostedMeetingsResponse, invitedMeetingsResponse);
    }
  } catch {
    // Invited meetings are supplementary; fall back to hosted meetings.
  }

  return hostedMeetingsResponse;
}

export async function getUpcomingMeetings() {
  if (!upcomingMeetingsPromise) {
    upcomingMeetingsPromise = fetchUpcomingMeetings().finally(() => {
      upcomingMeetingsPromise = undefined;
    });
  }

  return upcomingMeetingsPromise;
}

export async function getMeeting(meetingId: string) {
  const response = await fetchZoomApi(`https://api.zoom.us/v2/meetings/${meetingId}`, "Fetch meeting");
  const data = (await response.json()) as Meeting;
  return data;
}

export async function createInstantMeeting(token: string) {
  const response = await fetchZoomApi("https://api.zoom.us/v2/users/me/meetings", "Create instant meeting", {
    method: "POST",
    payload: { type: 1 },
    token,
  });

  const data = (await response.json()) as Meeting;
  return data;
}

type MeetingPayload = Partial<{
  start_time: string;
  duration: number;
  agenda: string;
  topic: string;
  timezone: string;
}>;

export async function createScheduledMeeting(payload: MeetingPayload) {
  const response = await fetchZoomApi("https://api.zoom.us/v2/users/me/meetings", "Create scheduled meeting", {
    method: "POST",
    payload,
  });

  const data = (await response.json()) as Meeting;
  return data;
}

export async function updateMeeting(meetingId: string, payload: MeetingPayload) {
  await fetchZoomApi(`https://api.zoom.us/v2/meetings/${meetingId}`, "Update meeting", {
    method: "PATCH",
    payload,
  });
}

export async function deleteMeeting(meetingId: string) {
  await fetchZoomApi(`https://api.zoom.us/v2/meetings/${meetingId}`, "Delete meeting", {
    method: "DELETE",
  });
}
