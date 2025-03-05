import { ActionPanel, List } from "@raycast/api";
import { Meeting } from "../types";
import CreateMeetingAction from "./CreateMeetingAction";

function EmptyView(props: { meetings: Meeting[]; searchText: string; onCreate: (id: string, title: string) => void }) {
  if (props.meetings.length > 0) {
    return (
      <List.EmptyView
        icon="😕"
        title="No matching meetings found"
        description={`Can't find a meeting matching ${props.searchText}.\nCreate it now!`}
        actions={
          <ActionPanel>
            <CreateMeetingAction defaultTitle={props.searchText} onCreate={props.onCreate} />
          </ActionPanel>
        }
      />
    );
  }
  return (
    <List.EmptyView
      icon="📆"
      title="No meetings found"
      description="You don't have any meetings yet. Why not add some?"
      actions={
        <ActionPanel>
          <CreateMeetingAction defaultTitle={props.searchText} onCreate={props.onCreate} />
        </ActionPanel>
      }
    />
  );
}

export default EmptyView;
