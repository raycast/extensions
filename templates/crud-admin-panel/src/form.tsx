import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { validate } from "email-validator";
import { createUser, updateUser, User } from "./api";

type FormValues = {
  email: string;
  firstName: string;
  lastName: string;
};

export default function UserForm(props: { user?: User; title?: string; onPop?: () => void }) {
  const { pop } = useNavigation();
  const { itemProps, handleSubmit, reset, focus } = useForm<FormValues>({
    initialValues: props.user,
    validation: {
      email(value) {
        return value && validate(value) ? undefined : "The email is invalid";
      },
      firstName: FormValidation.Required,
      lastName: FormValidation.Required,
    },
    async onSubmit(values) {
      await showToast({ style: Toast.Style.Animated, title: props.user ? "Updating user" : "Creating user" });

      try {
        if (props.user) {
          await updateUser(props.user, { email: values.email, firstName: values.firstName, lastName: values.lastName });
          await showToast({ style: Toast.Style.Success, title: "Updated user" });

          if (props.user) {
            if (props.onPop) {
              props.onPop();
            }

            pop();
          }
        } else {
          await createUser(values.email, values.firstName, values.lastName);
          await showToast({ style: Toast.Style.Success, title: "Created user" });

          reset();
          focus("email");
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: props.user ? "Failed updating user" : "Failed creating user",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });

  return (
    <Form
      navigationTitle={props.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={props.user ? "Update User" : "Create User"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Email" placeholder="ada@lovelace.com" autoFocus {...itemProps.email} />
      <Form.TextField title="First Name" placeholder="Ada" {...itemProps.firstName} />
      <Form.TextField title="Last Name" placeholder="Lovelace" {...itemProps.lastName} />
    </Form>
  );
}
