import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ZendeskTicketField, addTicketFieldOption } from "../../api/zendesk";
import { ZendeskInstance } from "../../utils/preferences";
import { truncateText } from "../../utils/formatters";

interface AddTicketFieldOptionFormProps {
  ticketField: ZendeskTicketField;
  instance: ZendeskInstance | undefined;
}

export default function AddTicketFieldOptionForm({ ticketField, instance }: AddTicketFieldOptionFormProps) {
  const { pop } = useNavigation();

  const getNavigationTitle = () => {
    return `Add Option to ${truncateText(ticketField.title || "Unknown Field")}`;
  };

  async function handleSubmit(values: { label: string; tag: string }) {
    if (!instance) {
      showFailureToast(new Error("No Zendesk instance configured."), { title: "Configuration Error" });
      return;
    }

    try {
      await addTicketFieldOption(ticketField.id, values.label, values.tag, instance);
      showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: "Ticket field option added successfully.",
      });
      pop();
    } catch {
      // Error toast is handled in the API function
    }
  }

  return (
    <Form
      navigationTitle={getNavigationTitle()}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Option" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Add a new option to the ticket field "${ticketField.title}"`} />
      <Form.TextField id="label" title="Label" placeholder="Enter option label" />
      <Form.TextField id="tag" title="Tag" placeholder="Enter option tag" />
    </Form>
  );
}
