import { Action, ActionPanel, Form, open, Toast, Clipboard, showToast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { format } from "date-fns";
import { createScheduledMeeting } from "../api/meetings";
import { getErrorMessage } from "../helpers/errors";

export type MeetingFormValues = {
  start_time: Date | null;
  duration: string;
  topic: string;
  agenda: string;
};

type MeetingFormProps = {
  enableDrafts: boolean;
  draftValues?: MeetingFormValues;
};

export default function MeetingForm({ enableDrafts = false, draftValues }: MeetingFormProps) {
  const { handleSubmit, itemProps, focus, reset } = useForm<MeetingFormValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Scheduling meeting" });

      try {
        const payload = {
          topic: values.topic,
          agenda: values.agenda,
          duration: values.duration ? parseInt(values.duration) : 60,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ...(values.start_time ? { start_time: format(values.start_time, "yyyy-MM-dd'T'HH:mm:ss") } : {}),
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

        reset({
          start_time: undefined,
          duration: "",
          topic: "",
          agenda: "",
        });

        focus("start_time");
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to schedule meeting";
        toast.message = getErrorMessage(error);
      }
    },
    validation: {
      start_time: FormValidation.Required,
      duration: (value) => {
        if (value && isNaN(parseInt(value ?? ""))) {
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

  return (
    <Form
      enableDrafts={enableDrafts}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Schedule Meeting" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker title="Start Time" {...itemProps.start_time} />

      <Form.Separator />

      <Form.TextField title="Duration" placeholder="Meeting duration in minutes" {...itemProps.duration} />

      <Form.TextField title="Topic" placeholder="Short topic for the meeting" {...itemProps.topic} />

      <Form.TextArea title="Agenda" placeholder="Meeting description" {...itemProps.agenda} />
    </Form>
  );
}
