import { useState } from "react";
import { Action, ActionPanel, Form } from "@raycast/api";
import { Preset } from "@zeitraum/client";
import { Authenticated } from "../authenticated";
import { TagPicker } from "../tagPicker";

export type PresetEditFormValues = {
  name: string;
  tags: string[];
  note?: string;
};

export const PresetEditForm = ({
  preset,
  onSubmit,
}: {
  preset?: Preset;
  onSubmit: (values: PresetEditFormValues) => void;
}) => {
  const isEditing = !!preset;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [note, setNote] = useState<string>(preset?.note ?? "");
  const [name, setName] = useState<string>(preset?.name ?? "");

  const validate = (values: PresetEditFormValues) => {
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
            <Action.SubmitForm onSubmit={validate} title={isEditing ? "Save Changes" : "Create Preset"} />
          </ActionPanel>
        }
        isLoading={loading}
      >
        <Form.TextField id="name" title="Name" value={name} onChange={setName} error={error} />
        <TagPicker defaultTags={preset?.tags} setLoading={setLoading} />
        <Form.TextArea id="note" title="Note" placeholder="Optional" value={note} onChange={setNote} />
      </Form>
    </Authenticated>
  );
};
