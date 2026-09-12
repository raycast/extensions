import { Form } from "@raycast/api";
import { useEffect, useState } from "react";
import { useTags } from "../lib/useTags";
import { Tag } from "@zeitraum/client";

export type TagPickerProps = {
  setLoading: (loading: boolean) => void;
  defaultTags?: Tag[];
};

export const TagPicker = ({ setLoading, defaultTags }: TagPickerProps) => {
  const { tags, loading } = useTags();
  const [selectedTags, setSelectedTags] = useState<string[]>(defaultTags?.map((tag) => tag.name) ?? []);
  const [noTags, setNoTags] = useState<boolean>(false);

  useEffect(() => {
    setLoading(loading);
    if (!loading && tags.length === 0) {
      setNoTags(true);
    }
  }, [loading]);

  return (
    <>
      <Form.TagPicker
        id="tags"
        title="Tags"
        value={selectedTags}
        onChange={setSelectedTags}
        error={noTags ? "No tags found" : undefined}
      >
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.name} title={tag.name} />
        ))}
      </Form.TagPicker>
      {noTags && <Form.Description text={'To create new tags, use the "Create Tag" command'} />}
    </>
  );
};
