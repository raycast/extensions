import { useState } from "react";
import { Action, ActionPanel, Form } from "@raycast/api";
import { Authenticated } from "../authenticated";
import { Tag } from "@zeitraum/client";

export type TagEditFormValues = {
  name: string;
};

export const TagEditForm = ({ tag, onSubmit }: { tag?: Tag; onSubmit: (values: TagEditFormValues) => void }) => {
  const isEditing = !!tag;
  const [error, setError] = useState<string | undefined>(undefined);
  const [name, setName] = useState<string>(tag?.name ?? "");

  const validate = (values: TagEditFormValues) => {
    if (!values.name || values.name.trim() === "") {
      setError("Name is required");
      return;
    }
    onSubmit(values);
  };

  return (
    <Authenticated>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm onSubmit={validate} title={isEditing ? "Save Changes" : "Create Tag"} />
          </ActionPanel>
        }
      >
        <Form.TextField id="name" title="Name" value={name} onChange={setName} error={error} />
      </Form>
    </Authenticated>
  );
};
