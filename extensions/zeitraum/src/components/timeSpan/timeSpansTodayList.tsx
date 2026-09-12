import { List } from "@raycast/api";
import { TimeSpanListItem } from "./timeSpanListItem";
import { getISOTimestamp } from "../../lib/dateUtils";
import { useEffect } from "react";
import { endOfDay, startOfDay } from "date-fns";
import { useTimeSpans } from "../../lib/useTimeSpans";

export const TimeSpansTodayList = ({ setLoading }: { setLoading: (value: boolean) => void }) => {
  const { timeSpans, loading: timeSpansLoading } = useTimeSpans({
    fromInclusive: getISOTimestamp(startOfDay(new Date())),
    toInclusive: getISOTimestamp(endOfDay(new Date())),
    running: false,
  });

  useEffect(() => setLoading(timeSpansLoading), [timeSpansLoading, setLoading]);

  return (
    <List.Section title="Today">
      {timeSpans.map((timeSpan) => (
        <TimeSpanListItem key={timeSpan.id} timeSpan={timeSpan} />
      ))}
    </List.Section>
  );
};
