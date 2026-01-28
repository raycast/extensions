import { createTimeSpan } from "./lib/zeitraumClient";
import { TimeSpanEditForm } from "./components/timeSpan/timeSpanEditForm";

export default function TrackCommand() {
  return <TimeSpanEditForm onSubmit={createTimeSpan} />;
}
