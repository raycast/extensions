import { Action, Icon } from "@raycast/api";
import EditMeetingForm from "./EditMeetingForm";

function EditMeetingAction(props: {
  defaultTitle?: string;
  defaultId?: string;
  onModify: (id: string, title: string, defaultId: string, defaultTitle: string) => void;
}) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Edit Meeting"
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      target={
        <EditMeetingForm defaultTitle={props.defaultTitle} defaultId={props.defaultId} onModify={props.onModify} />
      }
    />
  );
}

export default EditMeetingAction;
