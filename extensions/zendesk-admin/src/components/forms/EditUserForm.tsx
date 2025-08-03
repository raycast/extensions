import { ActionPanel, Action, Form, Icon, useNavigation, confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import { ZendeskUser, updateUser } from "../../api/zendesk";
import { ZendeskInstance } from "../../utils/preferences";

interface EditUserFormProps {
  user: ZendeskUser;
  instance: ZendeskInstance | undefined;
}

export default function EditUserForm({ user, instance }: EditUserFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: {
    name: string;
    alias: string;
    notes: string;
    tags: string[];
    description: string;
  }) {
    const updatedValues: Record<string, unknown> = {};

    if (values.name !== user.name) {
      updatedValues.name = values.name;
    }
    if (values.alias !== (user.alias || "") && user.role !== "end-user") {
      updatedValues.alias = values.alias;
    }
    if (values.notes !== (user.notes || "")) {
      updatedValues.notes = values.notes;
    }
    if (values.description !== (user.details || "")) {
      updatedValues.details = values.description;
    }
    if (JSON.stringify(values.tags) !== JSON.stringify(user.tags || [])) {
      updatedValues.tags = values.tags;
    }

    if (Object.keys(updatedValues).length === 0) {
      pop();
      return;
    }

    const options: Alert.Options = {
      title: "Update User",
      message: "Are you sure you want to save these changes?",
      icon: Icon.QuestionMark,
      primaryAction: {
        title: "Save",
        style: Alert.ActionStyle.Default,
      },
    };

    if (await confirmAlert(options)) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Updating user...",
      });
      try {
        if (!instance) {
          toast.style = Toast.Style.Failure;
          toast.title = "Configuration Error";
          toast.message = "No Zendesk instance provided for update.";
          return;
        }
        await updateUser(user.id, updatedValues, instance);
        toast.style = Toast.Style.Success;
        toast.title = "User updated successfully!";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update user.";
        if (error instanceof Error) {
          toast.message = error.message;
        }
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            onSubmit={handleSubmit}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "enter" },
              windows: { modifiers: ["ctrl"], key: "enter" },
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={user.name} />
      {user.role !== "end-user" && <Form.TextField id="alias" title="Alias" defaultValue={user.alias} />}
      <Form.TextArea id="notes" title="Notes" defaultValue={user.notes} />
      <Form.TextArea id="description" title="Description" defaultValue={user.details} />
    </Form>
  );
}
