import { useCallback, useEffect, useState } from "react";
import { apiGetTimeTrackingEntries } from "./api-early";
import { Activity, ActivityReport, TimeEntry, Tracking } from "./types";
import { humanizeDuration } from "./useCurrentTrackingStatus";
import { date, showError } from "./utils";

export const useTodayReport = (tracking: Tracking | null, activity?: Activity) => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [reportIsLoading, setReportIsLoading] = useState(true);
  const [reportMarkdown, setReportMarkdown] = useState("");

  useEffect(() => {
    const from = new Date(new Date().toDateString());
    const to = new Date(from.getTime() + 86400_000);

    apiGetTimeTrackingEntries({ from, to })
      .then(setEntries)
      .catch(showError)
      .finally(() => setReportIsLoading(false));
  }, [tracking]);

  const buildHeadlineWithTotal = useCallback(
    (totalBookedTime, ms, markdown) => {
      return setReportMarkdown(
        `Time entries you have tracked today (including current) sums to ${humanizeDuration(
          totalBookedTime + (ms || 0)
        )}:\n` + markdown
      );
    },
    [humanizeDuration]
  );

  useEffect(() => {
    if (reportIsLoading) {
      return;
    }
    const ms = Date.now() - new Date(tracking?.startedAt + "Z").getTime();

    const markStart = Date.now();

    const totalBookedTime = entries.reduce((acc, val) => {
      console.log(val.duration.startedAt);
      if (!val.duration.startedAt) {
        // Skip entries that are still running (no stoppedAt)
        return acc;
      }

      const startedAt = new Date(val.duration.startedAt + "Z").getTime();
      const stoppedAt = new Date(val.duration.stoppedAt + "Z").getTime();

      return (acc += stoppedAt - startedAt);
    }, 0);

    Promise.resolve(tracking && activity ? entries.concat([mockEntry(tracking, activity)]) : entries)
      .then(entries => entries.reduce(groupByActivity, [] as TimeEntry[][]))
      .then(grouped => grouped.map(arr => arr.reduce(groupIntoReport, blankReport(arr[0].activity))))
      .then(entries => entries.sort((l, r) => (l.duration > r.duration ? -1 : 1)))
      .then(entries => entries.map(entry => `* ${entry.activity.name} for ${humanizeDuration(entry.duration)}`))
      .then(list => list.join("\n\n"))
      .then(markdown =>
        markdown
          ? buildHeadlineWithTotal(totalBookedTime, ms, markdown)
          : setReportMarkdown("You didn't track anything today yet.")
      )
      .finally(() => console.debug(`building today report took ${Date.now() - markStart}ms`));
  }, [reportIsLoading, entries, tracking, activity]);

  return { reportMarkdown, reportIsLoading };
};

const groupByActivity = (acc: TimeEntry[][], val: TimeEntry) => {
  const arr = acc.find(arr => arr[0].activity.id === val.activity.id);
  arr ? arr.push(val) : acc.push([val]);

  return acc;
};

const groupIntoReport = (acc: ActivityReport, val: TimeEntry) => {
  const stoppedAt = new Date(val.duration.stoppedAt + "Z").getTime();
  const startedAt = new Date(val.duration.startedAt + "Z").getTime();

  acc.duration += stoppedAt - startedAt;

  return acc;
};

const blankReport = (activity: Activity) => ({ activity, duration: 0 } as ActivityReport);
const mockEntry = ({ startedAt }: Tracking, activity: Activity) =>
  ({
    id: "",
    creator: "",
    activity,
    note: {},
    duration: {
      startedAt,
      stoppedAt: date(new Date()),
    },
  } as TimeEntry);
