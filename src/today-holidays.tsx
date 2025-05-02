import moment from "moment";
import DateHoliday from "./components/dateHolidays";

export default function TodayHolidays() {
  return <DateHoliday selectedDate={moment()} />;
}
