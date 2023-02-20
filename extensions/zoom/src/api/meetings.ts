import fetch from "node-fetch";
import { getOAuthToken } from "../components/withZoomAuth";

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

export async function getUpcomingMeetings() {
  const response = await fetch(`https://api.zoom.us/v2/users/me/meetings?type=upcoming`, {
    headers: {
      Authorization: `Bearer ${getOAuthToken()}`,
    },
  });

  if (!response.ok) {
    console.error(`Fetch meetings error: ${await response.text()}`);
    throw new Error(response.statusText);
  }

  const data = (await response.json()) as { meetings: Meeting[] };
  return data;
}

export async function createInstantMeeting(token: string) {
  const response = await fetch(`https://api.zoom.us/v2/users/me/meetings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ type: 1 }),
  });

  if (!response.ok) {
    console.error(`Create instant meeting error: ${await response.text()}`);
    throw new Error(response.statusText);
  }

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
  const response = await fetch(`https://api.zoom.us/v2/users/me/meetings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOAuthToken()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error(`Create scheduled meeting error: ${await response.text()}`);
    throw new Error(response.statusText);
  }

  const data = (await response.json()) as Meeting;
  return data;
}

export async function updateMeeting(meetingId: string, payload: MeetingPayload) {
  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOAuthToken()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error(`Update meeting error: ${await response.text()}`);
    throw new Error(response.statusText);
  }
}

export async function deleteMeeting(meeting: Meeting) {
  const response = await fetch(`https://api.zoom.us/v2/meetings/${meeting.id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getOAuthToken()}`,
    },
  });

  if (!response.ok) {
    console.error(`Delete meeting error: ${await response.text()}`);
    throw new Error(response.statusText);
  }
}
