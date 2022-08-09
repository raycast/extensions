import { Action, ActionPanel, Form, open, Toast, Clipboard } from "@raycast/api";
import { format } from "date-fns";
import { useRef, useState } from "react";
import { createScheduledMeeting } from "../api/meetings";
import { getErrorMessage } from "../helpers/errors";

export type MeetingFormValues = {
  start_time: Date;
  duration: string;
  topic: string;
  agenda: string;
};

type MeetingFormProps = {
  enableDrafts: boolean;
  draftValues?: MeetingFormValues;
};

export default function MeetingForm({ enableDrafts = false, draftValues }: MeetingFormProps) {
  const startTimeRef = useRef<Form.DatePicker>(null);

  const [startTime, setStartTime] = useState(draftValues?.start_time);
  const [duration, setDuration] = useState(draftValues?.duration);
  const [topic, setTopic] = useState(draftValues?.topic);
  const [agenda, setAgenda] = useState(draftValues?.agenda);

  async function scheduleMeeting() {
    if (!startTime) {
      return;
    }

    const toast = new Toast({ style: Toast.Style.Animated, title: "Scheduling meeting" });
    await toast.show();

    try {
      const payload = {
        topic,
        agenda,
        start_time: format(startTime, "yyyy-MM-dd'T'HH:mm:ss"),
        duration: duration ? parseInt(duration) : 60,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const meeting = await createScheduledMeeting(payload);

      toast.style = Toast.Style.Success;
      toast.title = "Scheduled meeting";

      toast.primaryAction = {
        title: "Open Meeting",
        shortcut: { modifiers: ["cmd", "shift"], key: "o" },
        onAction: () => {
          open(meeting.join_url);
          return toast.hide();
        },
      };

      toast.secondaryAction = {
        title: "Copy Join URL",
        shortcut: { modifiers: ["cmd", "shift"], key: "c" },
        onAction: () => {
          Clipboard.copy(meeting.join_url);
          toast.title = "Copied to clipboard";
          toast.message = meeting.join_url;
        },
      };

      setStartTime(undefined);
      setDuration("");
      setTopic("");
      setAgenda("");

      startTimeRef.current?.focus();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to schedule meeting";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <Form
      enableDrafts={enableDrafts}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Schedule Meeting" onSubmit={scheduleMeeting} />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="start_time"
        title="Start Time"
        value={startTime}
        onChange={setStartTime}
        ref={startTimeRef}
      />

      <Form.Separator />

      <Form.TextField
        title="Duration"
        id="duration"
        placeholder="Meeting duration in minutes"
        value={duration}
        onChange={setDuration}
      />

      <Form.TextField
        title="Topic"
        id="topic"
        placeholder="Short topic for the meeting"
        value={topic}
        onChange={setTopic}
      />

      <Form.TextArea title="Agenda" id="agenda" placeholder="Meeting description" value={agenda} onChange={setAgenda} />
    </Form>
  );
}
