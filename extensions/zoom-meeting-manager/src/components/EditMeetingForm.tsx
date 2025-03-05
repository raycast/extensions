import { useCallback } from "react";
import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";

function EditMeetingForm(props: {
  defaultTitle?: string;
  defaultId?: string;
  onModify: (id: string, title: string, defaultTitle: string, defaultId: string) => void;
}) {
  const { onModify, defaultTitle = "", defaultId = "" } = props;
  const { pop } = useNavigation();

  const handleSubmit = useCallback(
    (values: { id: string; title: string }) => {
      onModify(values.id, values.title, defaultTitle, defaultId);
      pop();
    },
    [onModify, pop]
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Meeting" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" defaultValue={defaultTitle} title="Title" />
      <Form.TextField id="id" defaultValue={defaultId} title="ID" />
    </Form>
  );
}

export default EditMeetingForm;
