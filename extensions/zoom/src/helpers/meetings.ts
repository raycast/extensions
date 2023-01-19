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

  const [recurringMeetingsWithNoFixedTime, otherMeetings] = partition(meetings, (meeting) => meeting.type === 3);
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
    }, {})
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
