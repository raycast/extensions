import { TimeSpan, TimeSpanSearch } from "@zeitraum/client";
import { useEffect, useState } from "react";
import { client } from "./zeitraumClient";

export const useTimeSpans = (search: TimeSpanSearch = {}) => {
  const [timeSpans, setTimeSpans] = useState<TimeSpan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.timeSpans({ search }).then((fetched) => {
      setTimeSpans(fetched.data?.timeSpans.items ?? []);
      setLoading(false);
    });
  }, []);

  return { timeSpans, loading };
};
