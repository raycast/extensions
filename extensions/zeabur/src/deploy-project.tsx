import { ActionPanel, Form, Action, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import Deploying from "./components/deploying";

interface DeployProjectFormValues {
  folders: string[];
}

export default function Command() {
  const { push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<DeployProjectFormValues>({
    onSubmit(values) {
      push(<Deploying deployProjectPath={values["folders"][0]} />);
    },
    validation: {
      folders: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Deploy Project to Zeabur" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        {...itemProps.folders}
      />
    </Form>
  );
}
