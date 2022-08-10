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
import { Meeting } from "../api/meetings";

function isNextWeek(date: Date) {
  return isThisWeek(subDays(date, 7));
}

export function getMeetingTitle(meeting: Meeting) {
  const startTime = new Date(meeting.start_time);
  const endTime = addMinutes(startTime, meeting.duration);

  return `${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}`;
}

function getMeetingSection(meeting: Meeting) {
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

  const sections = Object.values(
    meetings.reduce<Record<string, MeetingSection>>((acc, meeting) => {
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
    }, {})
  );

  sections.sort((a, b) => compareAsc(a.date, b.date));

  return sections;
}
