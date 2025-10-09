import { ActionPanel, Detail, OpenInBrowserAction, PushAction } from "@raycast/api";
import { useCurrenTrackingStatus } from "./useCurrentTrackingStatus";
import { ComponentEditNote } from "./ComponentEditNote";
import { useEffect, useState } from "react";
import { Activity, Tracking } from "./types";
import { useTodayReport } from "./useTodayReport";
import { showError } from "./utils";

// noinspection JSUnusedGlobalSymbols
export default function CommandStatus() {
  const { presentation, data, actions } = useCurrenTrackingStatus();

  const { isLoading, note, markdown } = presentation;
  const { activity, tracking, activities } = data;
  const { startTracking, stopTracking, updateTracking } = actions;

  const { reportIsLoading, reportMarkdown } = useTodayReport(tracking, activity);

  const [noteMiddleman, setNoteMiddleman] = useState(note);
  const [activityMiddleman, setActivityMiddleman] = useState(activity);

  useEffect(() => {
    setNoteMiddleman(note);
  }, [note]);

  useEffect(() => {
    setActivityMiddleman(activity);
  }, [activity]);

  return (
    <Detail
      isLoading={isLoading || reportIsLoading}
      markdown={markdown + (reportIsLoading ? "" : "\n\n---\n" + reportMarkdown)}
      actions={
        <Actions
          isLoading={isLoading}
          note={noteMiddleman}
          activity={activityMiddleman}
          activities={activities}
          tracking={tracking}
          start={startTracking}
          stop={stopTracking}
          update={updateTracking}
        />
      }
    />
  );
}

type ActionsParams = {
  isLoading: boolean;
  tracking: Tracking | null;
  activity?: Activity;
  activities: Activity[];
  note: string;

  start: (params: { activityId: string }) => Promise<void>;
  stop: () => Promise<void>;
  update: (params: { spaceId: string; activityId: string; text: string; startedAt: string }) => Promise<void>;
};

const Actions = ({ isLoading, tracking, activity, activities, note, start, update, stop }: ActionsParams) => (
  <ActionPanel>
    {tracking && activity && (
      <PushAction
        icon={"✏️"}
        title={"Edit Note"}
        target={
          <ComponentEditNote
            note={note}
            activities={activities}
            activity={activity}
            startedAt={tracking.startedAt}
            onSubmit={params => update(params).catch(showError)}
          />
        }
      />
    )}
    {tracking && (
      <ActionPanel.Item
        icon={"⏹"}
        title="Stop"
        onAction={() => stop().catch(showError)}
        shortcut={{ key: "w", modifiers: ["cmd"] }}
      />
    )}
    {!isLoading && (activity ? activities.filter(a => a.id !== activity.id) : activities).length > 0 && (
      <ActionPanel.Submenu icon={"▶️"} title="Start Tracking" shortcut={{ key: "n", modifiers: ["cmd"] }}>
        {(activity ? activities.filter(a => a.id !== activity.id) : activities).map(activity => (
          <ActionPanel.Item
            key={activity.id}
            title={activity.name}
            onAction={() => start({ activityId: activity.id }).catch(showError)}
          />
        ))}
      </ActionPanel.Submenu>
    )}
    <OpenInBrowserAction url="https://product.early.app/#/weekly_view/calendar" title="Open Calendar in Browser" />
  </ActionPanel>
);
