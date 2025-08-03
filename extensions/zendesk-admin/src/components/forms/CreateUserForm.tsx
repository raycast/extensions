import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import { ZendeskInstance } from "../../utils/preferences";
import { createUser } from "../../api/zendesk";

interface CreateUserFormProps {
  instance: ZendeskInstance | undefined;
}

interface CreateUserFormValues {
  name: string;
  email: string;
}

export default function CreateUserForm({ instance }: CreateUserFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<CreateUserFormValues>({
    onSubmit: async (values) => {
      if (!instance) {
        showToast(Toast.Style.Failure, "Configuration Error", "No Zendesk instances configured.");
        return;
      }

      setIsLoading(true);
      try {
        const newUser = await createUser(values.name, values.email, instance);
        showToast({
          style: Toast.Style.Success,
          title: "User Created",
          message: `User ${newUser.name} created successfully.`,
        });
        pop(); // Close the form on success
      } catch (error) {
        showToast(
          Toast.Style.Failure,
          "Failed to Create User",
          error instanceof Error ? error.message : "An unknown error occurred.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      name: FormValidation.Required,
      email: (value) => {
        if (!value) {
          return "The item is required";
        }
        // Basic email regex validation
        if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)) {
          return "Invalid email format";
        }
      },
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Create User in ${instance?.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create User"
            icon={Icon.AddPerson}
            onSubmit={handleSubmit}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "enter" },
              windows: { modifiers: ["ctrl"], key: "enter" },
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Enter user's name" {...itemProps.name} />
      <Form.TextField title="Email" placeholder="Enter user's email" {...itemProps.email} />
    </Form>
  );
}
