import { Form, ActionPanel, Action, showToast, Clipboard } from "@raycast/api";
import zalgo from "to-zalgo";

type Values = {
  textfield: string;
};

export default function Command() {
  async function handleSubmit(values: Values) {
    const zalgodText = zalgo(values.textfield);

    Clipboard.copy(zalgodText);
    await showToast({ title: "Copied to clipboard" });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Provide the text you'd like to convert to Zalgo" />
      <Form.TextField id="textfield" title="Text" placeholder="Enter text" defaultValue="Raycast is cool!" />
    </Form>
  );
}
