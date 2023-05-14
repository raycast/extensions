import { useState } from "react";
import { useTags } from "../../lib/useTags";
import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { Preset } from "@zeitraum/client";
import { Authenticated } from "../authenticated";

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
  const { tags, loading } = useTags();
  const [selectedTags, setSelectedTags] = useState<string[]>(preset?.tags?.map((tag) => tag.name) ?? []);
  const [note, setNote] = useState<string>(preset?.note ?? "");
  const [name, setName] = useState<string>(preset?.name ?? "");

  return (
    <Authenticated>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              onSubmit={onSubmit}
              title={isEditing ? "Save Changes" : "Create Preset"}
              icon={Icon.Play}
            />
          </ActionPanel>
        }
        isLoading={loading}
      >
        <Form.TextField id="name" title="Name" value={name} onChange={setName} />
        <Form.TagPicker id="tags" title="Tags" value={selectedTags} onChange={setSelectedTags}>
          {tags.map((tag) => (
            <Form.TagPicker.Item key={tag.id} value={tag.name} title={tag.name} />
          ))}
        </Form.TagPicker>
        <Form.TextArea id="note" title="Note" placeholder="Optional" value={note} onChange={setNote} />
      </Form>
    </Authenticated>
  );
};
