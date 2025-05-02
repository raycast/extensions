import moment from "moment";
import { TranslatedHoliday } from "../types";

export const buildMarkdown = (
  holidays: TranslatedHoliday[],
  opts?: {
    startDate?: boolean;
    relativeDate?: boolean;
    reverse?: boolean;
    relativeOrdering?: boolean;
  },
) => {
  const showStartDate = opts?.startDate ?? false;
  const useRelativeDate = opts?.relativeDate ?? true;

  let sortedHolidays = holidays;

  if (opts?.relativeOrdering) {
    const now = moment();
    const upcomingHolidays = sortedHolidays.filter((holiday) => moment(holiday.start).isSameOrAfter(now));
    const pastHolidays = sortedHolidays.filter((holiday) => moment(holiday.start).isBefore(now));

    const sortByStartDate = (a: TranslatedHoliday, b: TranslatedHoliday) => moment(a.start).diff(moment(b.start));
    upcomingHolidays.sort(sortByStartDate);
    pastHolidays.sort(sortByStartDate);
    sortedHolidays = [...upcomingHolidays, ...pastHolidays];
  }

  if (opts?.reverse) {
    sortedHolidays = sortedHolidays.reverse();
  }

  return sortedHolidays
    .map(({ start, name, englishName }) => {
      const formattedDate = moment(start).format("dddd, MMMM Do");
      const relativeDate = moment(start).fromNow();

      let dateInfo = "";
      if (showStartDate) {
        dateInfo = `(Started ${relativeDate})`;
      } else if (useRelativeDate) {
        dateInfo = `(${relativeDate})`;
      }

      return `
### ${englishName ? `${englishName} (${name})` : name}

${formattedDate} ${dateInfo}
`;
    })
    .join("\n\n");
};
