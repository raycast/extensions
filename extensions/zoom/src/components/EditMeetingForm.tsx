import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";
import { useRef, useState } from "react";
import { Meeting, ScheduledMeeting, updateMeeting } from "../api/meetings";
import { getErrorMessage } from "../helpers/errors";

type EditMeetingFormProps = {
  meeting: ScheduledMeeting;
  mutate: MutatePromise<
    | {
        meetings: Meeting[];
      }
    | undefined
  >;
};

export default function MeetingForm({ meeting, mutate }: EditMeetingFormProps) {
  const { pop } = useNavigation();

  const startTimeRef = useRef<Form.DatePicker>(null);

  const [startTime, setStartTime] = useState<Date | null>(new Date(meeting.start_time));
  const [duration, setDuration] = useState(String(meeting.duration));
  const [topic, setTopic] = useState(meeting.topic);
  const [agenda, setAgenda] = useState(meeting.agenda);

  async function scheduleMeeting() {
    if (!startTime) {
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating meeting" });

    try {
      const payload = {
        topic,
        agenda,
        start_time: format(startTime, "yyyy-MM-dd'T'HH:mm:ss"),
        duration: duration ? parseInt(duration) : 60,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      await mutate(updateMeeting(meeting.id, payload), {
        optimisticUpdate(data) {
          if (!data) {
            return;
          }

          return { meetings: data.meetings.map((m) => (m.id === meeting.id ? { ...m, ...meeting } : m)) };
        },
      });

      toast.style = Toast.Style.Success;
      toast.title = "Updated meeting";

      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update meeting";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Meeting" onSubmit={scheduleMeeting} />
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
