import { Authenticated } from "./components/authenticated";
import { TimeSpanList } from "./components/timeSpan/timeSpanList";

export default function TimeSpansCommand() {
  return (
    <Authenticated>
      <TimeSpanList />
    </Authenticated>
  );
}
