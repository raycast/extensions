import { Action, ActionPanel, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";
import { Meeting, deleteMeeting as zoomDeleteMeeting } from "../api/meetings";
import { getErrorMessage } from "../helpers/errors";
import { getMeetingTitle, isRecurringMeetingWithNoFixedTime } from "../helpers/meetings";
import EditMeetingForm from "./EditMeetingForm";

type MeetingListItemProps = {
  meeting: Meeting;
  mutate: MutatePromise<
    | {
        meetings: Meeting[];
      }
    | undefined
  >;
};

export function MeetingListItem({ meeting, mutate }: MeetingListItemProps) {
  if (isRecurringMeetingWithNoFixedTime(meeting)) {
    return (
      <List.Item
        title={meeting.topic}
        accessories={[{ icon: Icon.ArrowClockwise }]}
        actions={<MeetingActionPanel meeting={meeting} mutate={mutate} />}
      />
    );
  }

  const startTime = new Date(meeting.start_time);

  const accessories: List.Item.Accessory[] = [
    {
      date: startTime,
      tooltip: `Start: ${format(startTime, "EEEE d MMMM yyyy 'at' HH:mm")}`,
    },
  ];

  if (meeting.type === 8) {
    accessories.unshift({ icon: Icon.ArrowClockwise });
  }

  return (
    <List.Item
      title={getMeetingTitle(meeting)}
      subtitle={meeting.topic}
      accessories={accessories}
      actions={<MeetingActionPanel meeting={meeting} mutate={mutate} />}
    />
  );
}

function MeetingActionPanel({ meeting, mutate }: MeetingListItemProps) {
  async function deleteMeeting(meeting: Meeting) {
    if (
      await confirmAlert({
        title: "Delete Meeting",
        message: "Are you sure you want to delete the selected meeting?",
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting meeting" });

        await mutate(zoomDeleteMeeting(meeting.id), {
          optimisticUpdate(data) {
            if (!data) {
              return data;
            }

            return {
              ...data,
              meetings: data?.meetings?.filter((m) => m.id !== meeting.id),
            };
          },
          rollbackOnError(data) {
            if (!data) {
              return data;
            }
            return {
              ...data,
              meetings: data?.meetings?.concat([meeting]),
            };
          },
        });

        await showToast({ style: Toast.Style.Success, title: "Deleted meeting" });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete meeting",
          message: getErrorMessage(error),
        });
      }
    }
  }

  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open Meeting in Zoom" url={meeting.join_url} />

      <ActionPanel.Section>
        {isRecurringMeetingWithNoFixedTime(meeting) ? null : (
          <Action.Push
            title="Edit Meeting"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={<EditMeetingForm meeting={meeting} mutate={mutate} />}
          />
        )}

        <Action
          title="Delete Meeting"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={() => deleteMeeting(meeting)}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Meeting ID"
          shortcut={{ modifiers: ["cmd"], key: "." }}
          content={meeting.id}
        />

        <Action.CopyToClipboard
          title="Copy Join URL"
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          content={meeting.join_url}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={mutate}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
