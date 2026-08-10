import {
  addMinutes,
  compareAsc,
  format,
  getYear,
  isThisMonth,
  isThisWeek,
  isThisYear,
  isToday,
  isTomorrow,
  subDays,
} from "date-fns";
import { partition } from "lodash";
import { Meeting, RecurringMeetingWithNoFixedTime, ScheduledMeeting } from "../api/meetings";

export function isRecurringMeetingWithNoFixedTime(meeting: Meeting): meeting is RecurringMeetingWithNoFixedTime {
  return meeting.type === 3;
}

function isNextWeek(date: Date) {
  return isThisWeek(subDays(date, 7));
}

export function getMeetingTitle(meeting: ScheduledMeeting) {
  const startTime = new Date(meeting.start_time);
  const endTime = addMinutes(startTime, meeting.duration);

  return `${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}`;
}

function getMeetingSection(meeting: ScheduledMeeting) {
  const startTime = new Date(meeting.start_time);

  const subtitle = format(startTime, "dd MMM");

  if (isToday(startTime)) {
    return { title: "Today", subtitle };
  }

  if (isTomorrow(startTime)) {
    return { title: "Tomorrow", subtitle };
  }

  if (isThisWeek(startTime)) {
    return { title: format(startTime, "EEEE"), subtitle };
  }

  if (isNextWeek(startTime)) {
    return { title: "Next Week" };
  }

  if (isThisMonth(startTime)) {
    return { title: "In the Month" };
  }

  if (isThisYear(startTime)) {
    return { title: format(startTime, "MMMM") };
  }

  // Return the year as a string since the
  // section title is used as a key
  return { title: String(getYear(startTime)) };
}

type MeetingSection = {
  title: string;
  subtitle?: string;
  date: Date;
  meetings: Meeting[];
};

export function getMeetingsSections(meetings?: Meeting[]) {
  if (!meetings) {
    return [];
  }

  const [recurringMeetingsWithNoFixedTime, otherMeetings] = partition(
    meetings,
    (meeting: Meeting) => meeting.type === 3,
  );
  const scheduledMeetings = otherMeetings as ScheduledMeeting[];

  const sections = Object.values(
    scheduledMeetings.reduce<Record<string, MeetingSection>>((acc, meeting) => {
      const { title, subtitle } = getMeetingSection(meeting);

      if (!acc[title]) {
        acc[title] = {
          title,
          subtitle,
          // Used to sort the meetings sections
          date: new Date(meeting.start_time),
          meetings: [] as Meeting[],
        };
      }

      acc[title].meetings.push(meeting);

      return acc;
    }, {}),
  );

  sections.sort((a, b) => compareAsc(a.date, b.date));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sectionsWithoutDates = sections.map(({ date, ...section }) => section);

  if (recurringMeetingsWithNoFixedTime.length > 0) {
    sectionsWithoutDates.push({
      title: "Recurring",
      meetings: recurringMeetingsWithNoFixedTime,
    });
  }

  return sectionsWithoutDates;
}

const isWindows = process.platform === "win32";

/**
 * Gets the appropriate Zoom URL based on the platform
 * On Windows, uses zoommtg:// protocol to launch Zoom app directly
 * On macOS, uses HTTPS URL which opens in browser and then launches Zoom
 * @param zoomUrl - The Zoom HTTPS join URL (e.g., https://us04web.zoom.us/j/123456789?pwd=abc123)
 * @returns The appropriate URL for the current platform
 */
export function getZoomUrlForPlatform(zoomUrl: string): string {
  if (!isWindows) return zoomUrl;

  try {
    const url = new URL(zoomUrl);
    const meetingId = url.pathname.split("/").pop() || "";
    const password = url.searchParams.get("pwd");

    let zoommtgUrl = `zoommtg://zoom.us/join?confno=${meetingId}`;
    if (password) {
      zoommtgUrl += `&pwd=${encodeURIComponent(password)}`;
    }
    return zoommtgUrl;
  } catch {
    return zoomUrl;
  }
}

/**
 * Gets the appropriate Zoom URL for a meeting ID (without password)
 * On Windows, uses zoommtg:// protocol to launch Zoom app directly
 * On macOS, uses HTTPS URL which opens in browser and then launches Zoom
 * @param meetingId - The Zoom meeting ID
 * @returns The appropriate URL for the current platform
 */
export function getZoomUrlForMeetingId(meetingId: string): string {
  return isWindows ? `zoommtg://zoom.us/join?confno=${meetingId}` : `https://zoom.us/j/${meetingId}`;
}
