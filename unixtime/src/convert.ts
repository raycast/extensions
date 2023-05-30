import { TimeItem } from "./types";
import { convertTimestamp, convertDateString } from "./utils";

export function ConvertTime(searchText: string): TimeItem[] {
  let items: TimeItem[] = [];
  let dateString = "";
  let timeString = "";
  const currentTime = Math.floor(Date.now() / 1000);
  const currentDateString = convertTimestamp(currentTime);
  if (searchText == "now" || searchText == "") {
    // default to current time
    // icon emoji if is time , then is a clock , else is a calendar
    items = [
      { id: 1, val: currentTime.toString(), icon: "⏱️", isCurrent: true, tType: "time", ctime: currentDateString },
      { id: 2, val: currentDateString, icon: "📅", isCurrent: true, tType: "date", ctime: currentDateString }
    ];
  } else if (searchText.length > 12) {
    // convert date string to timestamp
    const timeInt = convertDateString(searchText);
    timeString = timeInt.toString();
    items = [
      { id: 1, val: timeString, icon: "📅", isCurrent: true, tType: "time", ctime: currentDateString }
    ];

  } else if (searchText.length >= 10) {
    // convert timestamp to date string
    dateString = convertTimestamp(parseInt(searchText));
    items = [
      { id: 1, val: dateString, isCurrent: true, icon: "📅", tType: "date", ctime: currentDateString }
    ];

  } else {
    // bugs
    items = [
      { id: 1, val: "wrong time format", icon: "🐞️", isCurrent: true, tType: "wrong", ctime: currentDateString }
    ];
  }


  return items;
}