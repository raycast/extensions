import { List } from "@raycast/api";
import { TimeSpanListItem } from "./timeSpanListItem";
import { useEffect } from "react";
import { useTimeSpans } from "../../lib/useTimeSpans";

export const TimeSpansActiveList = ({ setLoading }: { setLoading: (value: boolean) => void }) => {
  const { timeSpans, loading: timeSpansLoading } = useTimeSpans({ running: true });

  useEffect(() => setLoading(timeSpansLoading), [timeSpansLoading, setLoading]);

  return (
    <List.Section title="Running">
      {timeSpans.map((timeSpan) => (
        <TimeSpanListItem key={timeSpan.id} timeSpan={timeSpan} allowStop />
      ))}
    </List.Section>
  );
};
