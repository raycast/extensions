import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { openChannel, sendUpdate } from "./slack";
import { Update } from "./types";

export default function Command() {
  const { itemProps, handleSubmit } = useForm<Update>({
    validation: {
      today: FormValidation.Required,
    },
    async onSubmit(values) {
      await showToast({ style: Toast.Style.Animated, title: "Sending update" });

      try {
        await sendUpdate(values);
        await showToast({
          style: Toast.Style.Success,
          title: "Send update",
          primaryAction: {
            title: "Open Channel",
            shortcut: { modifiers: ["cmd", "shift"], key: "o" },
            async onAction(toast) {
              await openChannel();
              await toast.hide();
            },
          },
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed sending update",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Update" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Yesterday"
        placeholder="Fixed a gnarly bug"
        info="What did you do yesterday?"
        enableMarkdown
        {...itemProps.yesterday}
      />
      <Form.TextArea
        title="Today"
        placeholder="Implement an important feature"
        info="What do you do today?"
        enableMarkdown
        {...itemProps.today}
      />
      <Form.TextArea
        title="Blockers"
        placeholder="Awaiting decision on secret project"
        info="What does block you making progress?"
        enableMarkdown
        {...itemProps.blockers}
      />
    </Form>
  );
}
