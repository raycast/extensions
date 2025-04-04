import { useCallback, useEffect, useState } from "react";
import { Action, ActionPanel, List, open, Icon } from "@raycast/api";
import { Meeting } from "./types";
import {
  CreateMeetingAction,
  DeleteMeetingAction,
  EmptyView,
  MoveMeetingUpAction,
  MoveMeetingDownAction,
  ReadConfig,
  WriteConfig,
} from "./components";
import EditMeetingAction from "./components/EditMeetingAction";

type State = {
  isLoading: boolean;
  searchText: string;
  meetings: Meeting[];
};

export default function Command() {
  const [state, setState] = useState<State>({
    isLoading: true,
    searchText: "",
    meetings: [],
  });

  useEffect(() => {
    (() => {
      const storedMeetings: string = ReadConfig();
      if (!storedMeetings) {
        setState((previous) => ({ ...previous, isLoading: false }));
        return;
      }

      try {
        const myMeetings: Meeting[] = JSON.parse(storedMeetings);
        setState((previous) => ({ ...previous, meetings: myMeetings, isLoading: false }));
      } catch (e) {
        setState((previous) => ({ ...previous, meetings: [], isLoading: false }));
      }
    })();
  }, []);

  useEffect(() => {
    WriteConfig(JSON.stringify(state.meetings));
  }, [state.meetings]);

  const handleCreate = useCallback(
    (id: string, title: string) => {
      const newMeetings = [...state.meetings, { id, title }];
      setState((previous) => ({ ...previous, meetings: newMeetings, searchText: "" }));
    },
    [state.meetings, setState]
  );

  const handleEdit = useCallback(
    (id: string, title: string, defaultTitle: string, defaultId: string) => {
      const newMeetings = [...state.meetings];
      let tmp_index = [...state.meetings].findIndex(function (i: Meeting) {
        return i.title === defaultTitle;
      });
      if (tmp_index == -1) {
        tmp_index = [...state.meetings].findIndex(function (i: Meeting) {
          return i.id === defaultId;
        });
      }
      newMeetings[tmp_index] = { id: id, title: title };
      setState((previous) => ({ ...previous, meetings: newMeetings, searchText: "" }));
    },
    [state.meetings, setState]
  );

  const handleDelete = useCallback(
    (index: number) => {
      const newMeetings = [...state.meetings];
      newMeetings.splice(index, 1);
      setState((previous) => ({ ...previous, meetings: newMeetings }));
    },
    [state.meetings, setState]
  );

  const moveUp = useCallback(
    (index: number) => {
      let newMeetings = [...state.meetings];
      if (index <= 0) {
        console.log("Can't move top of the list further up");
        return;
      }
      newMeetings = [...state.meetings];
      const tmp = newMeetings[index];
      newMeetings[index] = newMeetings[index - 1];
      newMeetings[index - 1] = tmp;
      setState((previous) => ({ ...previous, meetings: newMeetings }));
    },
    [state.meetings, setState]
  );

  const moveDown = useCallback(
    (index: number) => {
      const newMeetings = [...state.meetings];
      if (index >= newMeetings.length - 1) {
        console.log("Can't move bottom of the list further down");
        return;
      }
      const tmp = newMeetings[index];
      newMeetings[index] = newMeetings[index + 1];
      newMeetings[index + 1] = tmp;
      setState((previous) => ({ ...previous, meetings: newMeetings }));
    },
    [state.meetings, setState]
  );

  const filterMeetings = useCallback(() => {
    return state.meetings;
  }, [state.meetings]);

  return (
    <List
      isLoading={state.isLoading}
      searchText={state.searchText}
      enableFiltering
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, searchText: newValue }));
      }}
    >
      <EmptyView meetings={filterMeetings()} searchText={state.searchText} onCreate={handleCreate} />
      {filterMeetings().map((meeting, index) => (
        <List.Item
          key={meeting.id}
          title={meeting.title}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title="Open meeting"
                  icon={Icon.Monitor}
                  onAction={async () => await open(`zoommtg://zoom.us/join?confno=${meeting.id}`, "us.zoom.xos")}
                />
                <CreateMeetingAction onCreate={handleCreate} />
                <EditMeetingAction defaultTitle={meeting.title} defaultId={meeting.id} onModify={handleEdit} />
                <DeleteMeetingAction onDelete={() => handleDelete(index)} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <MoveMeetingUpAction onMoveUp={() => moveUp(index)} />
                <MoveMeetingDownAction onMoveDown={() => moveDown(index)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
