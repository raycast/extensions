import { useCallback } from "react";
import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";

function CreateMeetingForm(props: { defaultTitle?: string; onCreate: (id: string, title: string) => void }) {
  const { onCreate, defaultTitle = "" } = props;
  const { pop } = useNavigation();

  const handleSubmit = useCallback(
    (values: { id: string; title: string }) => {
      onCreate(values.id, values.title);
      pop();
    },
    [onCreate, pop]
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Meeting" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" defaultValue={defaultTitle} title="Title" />
      <Form.TextField id="id" title="ID" />
    </Form>
  );
}

export default CreateMeetingForm;
