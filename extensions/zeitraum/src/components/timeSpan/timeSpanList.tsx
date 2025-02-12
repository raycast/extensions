import { List } from "@raycast/api";
import { useState } from "react";
import { TimeSpansActiveList } from "./timeSpansActiveList";
import { TimeSpansTodayList } from "./timeSpansTodayList";

export const TimeSpanList = () => {
  const [loading, setLoading] = useState(true);
  return (
    <List
      filtering={true}
      navigationTitle="Search timers"
      searchBarPlaceholder="Search for time spans"
      isShowingDetail={!loading}
      isLoading={loading}
    >
      <TimeSpansActiveList setLoading={setLoading} />
      <TimeSpansTodayList setLoading={setLoading} />
    </List>
  );
};
