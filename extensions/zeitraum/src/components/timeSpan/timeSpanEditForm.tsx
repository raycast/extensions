import { useState } from "react";
import { useTags } from "../../lib/useTags";
import { formatTimerRuntime } from "../../lib/dateUtils";
import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { TimeSpan } from "@zeitraum/client";
import { parseISO } from "date-fns";
import { Authenticated } from "../authenticated";

export type TimeSpanEditFormValues = {
  tags: string[];
  note?: string;
  startTime?: Date;
  endTime?: Date;
};

export const TimeSpanEditForm = ({
  timeSpan,
  onSubmit,
}: {
  timeSpan?: TimeSpan;
  onSubmit: (values: TimeSpanEditFormValues) => void;
}) => {
  const isEditing = !!timeSpan;
  const { tags, loading } = useTags();
  const [selectedTags, setSelectedTags] = useState<string[]>(timeSpan?.tags?.map((tag) => tag.name) ?? []);
  const [note, setNote] = useState<string>(timeSpan?.note ?? "");
  const [startTime, setStartTime] = useState<Date>(timeSpan?.start ? parseISO(timeSpan.start) : new Date());
  const [endTime, setEndTime] = useState<Date | null>(timeSpan?.end ? parseISO(timeSpan.end) : null);

  return (
    <Authenticated>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              onSubmit={onSubmit}
              title={isEditing ? "Save Changes" : endTime ? "Create Timespan" : "Start Timer"}
              icon={Icon.Play}
            />
          </ActionPanel>
        }
        isLoading={loading}
      >
        <Form.TagPicker id="tags" title="Tags" value={selectedTags} onChange={setSelectedTags}>
          {tags.map((tag) => (
            <Form.TagPicker.Item key={tag.id} value={tag.name} title={tag.name} />
          ))}
        </Form.TagPicker>
        <Form.Separator />
        <Form.DatePicker
          id="startTime"
          title="Start time"
          value={startTime}
          onChange={(date) => setStartTime(date ?? new Date())}
          info={
            isEditing ? "Change the start time of the time span" : "Create the time span from a different point in time"
          }
        />
        <Form.DatePicker
          id="endTime"
          title="End time"
          value={endTime}
          onChange={setEndTime}
          info={
            isEditing
              ? "Change the end time of the time span"
              : "Optionally, create a time span without starting a timer"
          }
        />
        {endTime && (
          <Form.Description
            text={`${isEditing ? "Editing" : "Creating"} time span with duration ${formatTimerRuntime(
              startTime ?? new Date(),
              endTime
            )}`}
          />
        )}
        <Form.TextArea id="note" title="Note" placeholder="Optional" value={note} onChange={setNote} />
      </Form>
    </Authenticated>
  );
};
