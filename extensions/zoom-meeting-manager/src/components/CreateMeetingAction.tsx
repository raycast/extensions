import { Action, Icon } from "@raycast/api";
import CreateMeetingForm from "./CreateMeetingForm";

function CreateMeetingAction(props: { defaultTitle?: string; onCreate: (id: string, title: string) => void }) {
  return (
    <Action.Push
      icon={Icon.NewDocument}
      title="Create Meeting"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateMeetingForm defaultTitle={props.defaultTitle} onCreate={props.onCreate} />}
    />
  );
}

export default CreateMeetingAction;
