import { Action, ActionPanel, Color, Form, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";

// Properties are uppercase to match name of fields in Airtable
type FormValues = {
  Name: string;
  Description: string;
  Priority: "Critical" | "High" | "Normal" | "Low";
};

type Preferences = {
  apiKey: string;
  baseId: string;
};

const preferences: Preferences = getPreferenceValues();

export default function Command(props: { draftValues?: FormValues }) {
  async function handleSubmit(values: FormValues) {
    console.log(values);
    await showToast({ style: Toast.Style.Animated, title: "Reporting bug" });
    try {
      const response = await fetch(`https://api.airtable.com/v0/${preferences.baseId}/Bugs%20and%20issues`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${preferences.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                ...values,
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        throw Error(`${response.statusText} (HTTP ${response.status})`);
      }

      await showToast({ style: Toast.Style.Success, title: "Reported bug" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed reporting bug",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Bug} title="Report Bug" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="Name" title="Name" placeholder="What went wrong?" defaultValue={props.draftValues?.Name} />
      <Form.TextArea
        id="Description"
        title="Description"
        placeholder="How can you reproduce the bug?"
        defaultValue={props.draftValues?.Description}
      />
      <Form.Dropdown id="Priority" title="Priority" defaultValue={props.draftValues?.Priority} storeValue>
        <Form.Dropdown.Item icon={{ source: Icon.Circle, tintColor: Color.Red }} title="Critical" value="Critical" />
        <Form.Dropdown.Item icon={{ source: Icon.Circle, tintColor: Color.Yellow }} title="High" value="High" />
        <Form.Dropdown.Item icon={{ source: Icon.Circle, tintColor: Color.Green }} title="Normal" value="Normal" />
        <Form.Dropdown.Item icon={{ source: Icon.Circle, tintColor: Color.Blue }} title="Low" value="Low" />
      </Form.Dropdown>
    </Form>
  );
}
