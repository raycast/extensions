import { MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { isThisWeek } from "date-fns";
import { useMemo, Fragment } from "react";
import { withZoomAuth } from "./components/withZoomAuth";
import { getUpcomingMeetings } from "./api/meetings";
import { getMeetingsSections, getMeetingTitle } from "./helpers/meetings";

function ThisWeekMeetings() {
  const { data, isLoading } = useCachedPromise(getUpcomingMeetings);

  const sections = useMemo(() => {
    const thisWeekMeetings = data?.meetings?.filter(
      (meeting) => "start_time" in meeting && isThisWeek(new Date(meeting.start_time))
    );
    return getMeetingsSections(thisWeekMeetings);
  }, [data]);

  return (
    <MenuBarExtra icon="zoom.png" tooltip="Your Zoom meetings for this week" isLoading={isLoading}>
      {sections && sections.length > 0 ? (
        sections.map((section) => {
          return (
            <Fragment key={section.title}>
              <MenuBarExtra.Item key={section.title} title={`${section.title}, ${section.subtitle}`} />

              {section.meetings.map((meeting, index) => {
                if ("start_time" in meeting) {
                  return (
                    <MenuBarExtra.Item
                      key={`${meeting.uuid}-${index}`}
                      title={`${getMeetingTitle(meeting)}: ${meeting.topic}`}
                      onAction={() => open(meeting.join_url)}
                    />
                  );
                }
              })}
            </Fragment>
          );
        })
      ) : (
        <MenuBarExtra.Item title="No meetings for this week." />
      )}
    </MenuBarExtra>
  );
}

export default withZoomAuth(ThisWeekMeetings);
