import { Action, ActionPanel, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { format } from "date-fns";
import { useMemo } from "react";
import { getUpcomingMeetings, Meeting, deleteMeeting as zoomDeleteMeeting } from "./api/meetings";
import { getMeetingTitle, getMeetingsSections } from "./helpers/meetings";
import { getErrorMessage } from "./helpers/errors";
import MeetingForm from "./components/CreateMeetingForm";
import { withZoomAuth } from "./components/withZoomAuth";
import EditMeetingForm from "./components/EditMeetingForm";

function UpcomingMeetings() {
  const { data, isLoading, mutate } = useCachedPromise(getUpcomingMeetings);

  const sections = useMemo(() => getMeetingsSections(data?.meetings), [data]);

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

        await mutate(zoomDeleteMeeting(meeting), {
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
    <List isLoading={isLoading}>
      <List.EmptyView
        title="No meetings"
        description="You don't have any upcoming meetings."
        actions={
          <ActionPanel>
            <Action.Push title="Schedule Meeting" target={<MeetingForm enableDrafts={false} />} />
          </ActionPanel>
        }
      />

      {sections.map((section) => {
        return (
          <List.Section key={section.title} title={section.title} subtitle={section.subtitle}>
            {section.meetings.map((meeting) => {
              const startTime = new Date(meeting.start_time);

              return (
                <List.Item
                  key={meeting.uuid}
                  title={getMeetingTitle(meeting)}
                  subtitle={meeting.topic}
                  accessories={[
                    {
                      date: startTime,
                      tooltip: `Start: ${format(startTime, "EEEE d MMMM yyyy 'at' HH:mm")}`,
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser title="Open Meeting in Zoom" url={meeting.join_url} />

                      <ActionPanel.Section>
                        <Action.Push
                          title="Edit Meeting"
                          icon={Icon.Pencil}
                          shortcut={{ modifiers: ["cmd"], key: "e" }}
                          target={<EditMeetingForm meeting={meeting} mutate={mutate} />}
                        />

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
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}

export default function Command() {
  return withZoomAuth(<UpcomingMeetings />);
}
