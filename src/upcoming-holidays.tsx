import moment from "moment";
import GlobalHolidays from "./components/globalHolidays";

export default function UpcomingHolidays() {
  return <GlobalHolidays dateFilter={(holidayDate) => holidayDate.isAfter(moment().startOf("day"))} />;
}
