import { Action, ActionPanel, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { getUpcomingMeetings } from "./api/meetings";
import { getMeetingsSections } from "./helpers/meetings";
import MeetingForm from "./components/CreateMeetingForm";
import { withZoomAuth } from "./components/withZoomAuth";
import { MeetingListItem } from "./components/MeetingListItem";

function UpcomingMeetings() {
  const { data, isLoading, mutate } = useCachedPromise(getUpcomingMeetings);

  const sections = useMemo(() => getMeetingsSections(data?.meetings), [data]);

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
            {section.meetings.map((meeting, index) => {
              return <MeetingListItem meeting={meeting} key={`${meeting.uuid}-${index}`} mutate={mutate} />;
            })}
          </List.Section>
        );
      })}
    </List>
  );
}

export default withZoomAuth(UpcomingMeetings);
