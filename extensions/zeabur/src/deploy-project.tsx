import { ActionPanel, Form, Action, useNavigation, getSelectedFinderItems } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useEffect, useState } from "react";
import Deploying from "./components/deploying";

interface DeployProjectFormValues {
  folders: string[];
}

export default function Command() {
  const { push } = useNavigation();
  const { handleSubmit, itemProps, setValue } = useForm<DeployProjectFormValues>({
    onSubmit(values) {
      push(<Deploying deployProjectPath={values["folders"][0]} />);
    },
    validation: {
      folders: FormValidation.Required,
    },
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function getSelectedFolder() {
      try {
        const items = await getSelectedFinderItems();
        if (items.length === 1 && items[0].path && items[0].path.endsWith("/")) {
          setValue("folders", [items[0].path]);
        }
      } catch {
        return;
      } finally {
        setIsLoading(false);
      }
    }
    getSelectedFolder();
  }, []);

  return (
    <Form
      isLoading={isLoading}
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
