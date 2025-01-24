import { Action, ActionPanel, Form, showToast, Toast, showHUD } from "@raycast/api";
import { closeMainWindow, popToRoot } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect } from "react";
import { readKeywords, writeKeywords } from "./lib/keywords-manager";

interface FormValues {
  keywords: string;
}

export default function Command() {
  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    validation: {
      keywords: (value) => {
        if (!value?.trim()) {
          return "Keywords List cannot be empty";
        }
      },
    },
    async onSubmit(values) {
      try {
        const keywordsList = values.keywords
          .split("\n")
          .map((k) => k.trim())
          .filter((k) => k.length > 0);

        await writeKeywords(keywordsList);
        await showHUD("✅ Save keywords successfully");
        await popToRoot();
        closeMainWindow();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "❌ Save keywords failed",
          message: String(error),
        });
      }
    },
  });

  useEffect(() => {
    async function loadKeywords() {
      try {
        const keywordsList = await readKeywords();
        setValue("keywords", keywordsList.join("\n"));
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "❌ Read keywords failed",
          message: String(error),
        });
      }
    }
    loadKeywords();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Edit Keywords" placeholder="Enter one keyword per line" {...itemProps.keywords} />
    </Form>
  );
}
