import { Action, ActionPanel, Form, open, Toast, Clipboard } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { format } from "date-fns";
import { useRef } from "react";
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
  const { handleSubmit, itemProps } = useForm<MeetingFormValues>({
    async onSubmit(values) {
      const toast = new Toast({ style: Toast.Style.Animated, title: "Scheduling meeting" });
      await toast.show();

      try {
        const payload = {
          topic: values.topic,
          agenda: values.agenda,
          start_time: format(values.start_time, "yyyy-MM-dd'T'HH:mm:ss"),
          duration: values.duration ? parseInt(values.duration) : 60,
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

        // TODO: reset the values

        startTimeRef.current?.focus();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to schedule meeting";
        toast.message = getErrorMessage(error);
      }
    },
    validation: {
      start_time: FormValidation.Required,
      duration: (value) => {
        if (isNaN(parseInt(value ?? ""))) {
          return "The duration must be a number";
        }
      },
    },
    initialValues: {
      start_time: draftValues?.start_time,
      duration: draftValues?.duration,
      topic: draftValues?.topic,
      agenda: draftValues?.agenda,
    },
  });

  const startTimeRef = useRef<Form.DatePicker>(null);

  return (
    <Form
      enableDrafts={enableDrafts}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Schedule Meeting" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker title="Start Time" ref={startTimeRef} {...itemProps.start_time} />

      <Form.Separator />

      <Form.TextField title="Duration" placeholder="Meeting duration in minutes" {...itemProps.duration} />

      <Form.TextField title="Topic" placeholder="Short topic for the meeting" {...itemProps.topic} />

      <Form.TextArea title="Agenda" placeholder="Meeting description" {...itemProps.agenda} />
    </Form>
  );
}
