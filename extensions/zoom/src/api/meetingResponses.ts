import type { Meeting } from "./meetings";

export type MeetingListResponse = {
  meetings: Meeting[];
  total_records?: number;
  next_page_token?: string;
  page_count?: number;
  page_number?: number;
  page_size?: number;
};

function getMeetingKey(meeting: Meeting) {
  if (meeting.uuid) {
    return `uuid:${meeting.uuid}`;
  }

  const startTime = "start_time" in meeting ? meeting.start_time : "";
  return `meeting:${meeting.id}:${startTime}:${meeting.topic}`;
}

export function mergeMeetingResponses(
  hostedMeetingsResponse: MeetingListResponse,
  invitedMeetingsResponse: MeetingListResponse,
): MeetingListResponse {
  const seenMeetings = new Set<string>();
  const meetings: Meeting[] = [];

  for (const meeting of [...hostedMeetingsResponse.meetings, ...invitedMeetingsResponse.meetings]) {
    const key = getMeetingKey(meeting);

    if (seenMeetings.has(key)) {
      continue;
    }

    seenMeetings.add(key);
    meetings.push(meeting);
  }

  return {
    ...hostedMeetingsResponse,
    meetings,
    total_records: meetings.length,
  };
}
