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

export async function getMeeting(meetingId: string) {
  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    headers: {
      Authorization: `Bearer ${getOAuthToken()}`,
    },
  });

  if (!response.ok) {
    console.error(`Fetch meeting error: ${await response.text()}`);
    throw new Error(response.statusText);
  }

  const data = (await response.json()) as Meeting;
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

export type timezone =
  | "Pacific/Midway"
  | "Pacific/Pago_Pago"
  | "Pacific/Honolulu"
  | "America/Anchorage"
  | "America/Vancouver"
  | "America/Los_Angeles"
  | "America/Tijuana"
  | "America/Edmonton"
  | "America/Phoenix"
  | "America/Mazatlan"
  | "America/Winnipeg"
  | "America/Regina"
  | "America/Chicago"
  | "America/Mexico_City"
  | "America/Guatemala"
  | "America/El_Salvador"
  | "America/Managua"
  | "America/Costa_Rica"
  | "America/Montreal"
  | "America/New_York"
  | "America/Indianapolis"
  | "America/Panama"
  | "America/Bogota"
  | "America/Lima"
  | "America/Halifax"
  | "America/Puerto_Rico"
  | "America/Caracas"
  | "America/Santiago"
  | "America/St_Johns"
  | "America/Montevideo"
  | "America/Araguaina"
  | "America/Argentina"
  | "America/Godthab"
  | "America/Sao_Paulo"
  | "Atlantic/Azores"
  | "Canada/Atlantic"
  | "Atlantic/Cape_Verde"
  | "UTC"
  | "Etc/Greenwich"
  | "Europe/Belgrade"
  | "CET"
  | "Atlantic/Reykjavik"
  | "Europe/Dublin"
  | "Europe/London"
  | "Europe/Lisbon"
  | "Africa/Casablanca"
  | "Africa/Nouakchott"
  | "Europe/Oslo"
  | "Europe/Copenhagen"
  | "Europe/Brussels"
  | "Europe/Berlin"
  | "Europe/Helsinki"
  | "Europe/Amsterdam"
  | "Europe/Rome"
  | "Europe/Stockholm"
  | "Europe/Vienna"
  | "Europe/Luxembourg"
  | "Europe/Paris"
  | "Europe/Zurich"
  | "Europe/Madrid"
  | "Africa/Bangui"
  | "Africa/Algiers"
  | "Africa/Tunis"
  | "Africa/Harare"
  | "Africa/Nairobi"
  | "Europe/Warsaw"
  | "Europe/Prague"
  | "Europe/Budapest"
  | "Europe/Sofia"
  | "Europe/Istanbul"
  | "Europe/Athens"
  | "Europe/Bucharest"
  | "Asia/Nicosia"
  | "Asia/Beirut"
  | "Asia/Damascus"
  | "Asia/Jerusalem"
  | "Asia/Amman"
  | "Africa/Tripoli"
  | "Africa/Cairo"
  | "Africa/Johannesburg"
  | "Europe/Moscow"
  | "Asia/Baghdad"
  | "Asia/Kuwait"
  | "Asia/Riyadh"
  | "Asia/Bahrain"
  | "Asia/Qatar"
  | "Asia/Aden"
  | "Asia/Tehran"
  | "Africa/Khartoum"
  | "Africa/Djibouti"
  | "Africa/Mogadishu"
  | "Asia/Dubai"
  | "Asia/Muscat"
  | "Asia/Baku"
  | "Asia/Kabul"
  | "Asia/Yekaterinburg"
  | "Asia/Tashkent"
  | "Asia/Calcutta"
  | "Asia/Kathmandu"
  | "Asia/Novosibirsk"
  | "Asia/Almaty"
  | "Asia/Dacca"
  | "Asia/Krasnoyarsk"
  | "Asia/Dhaka"
  | "Asia/Bangkok"
  | "Asia/Saigon"
  | "Asia/Jakarta"
  | "Asia/Irkutsk"
  | "Asia/Shanghai"
  | "Asia/Hong_Kong"
  | "Asia/Taipei"
  | "Asia/Kuala_Lumpur"
  | "Asia/Singapore"
  | "Australia/Perth"
  | "Asia/Yakutsk"
  | "Asia/Seoul"
  | "Asia/Tokyo"
  | "Australia/Darwin"
  | "Australia/Adelaide"
  | "Asia/Vladivostok"
  | "Pacific/Port_Moresby"
  | "Australia/Brisbane"
  | "Australia/Sydney"
  | "Australia/Hobart"
  | "Asia/Magadan"
  | "SST"
  | "Pacific/Noumea"
  | "Asia/Kamchatka"
  | "Pacific/Fiji"
  | "Pacific/Auckland"
  | "Asia/Kolkata"
  | "Europe/Kiev"
  | "America/Tegucigalpa"
  | "Pacific/Apia";

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

export async function deleteMeeting(meetingId: string) {
  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
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
