import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useForm, FormValidation, showFailureToast } from "@raycast/utils";
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
        showFailureToast(new Error("No Zendesk instances configured."), { title: "Configuration Error" });
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
        showFailureToast(error, { title: "Failed to Create User" });
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
      navigationTitle="Create User"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create User" icon={Icon.AddPerson} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Enter user's name" {...itemProps.name} />
      <Form.TextField title="Email" placeholder="Enter user's email" {...itemProps.email} />
    </Form>
  );
}
