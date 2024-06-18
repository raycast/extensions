import { Action, ActionPanel, Form, Icon, openCommandPreferences, useNavigation } from "@raycast/api";

export default function ChoosingFolder({
  setCachedFolder,
  isInitial,
}: {
  setCachedFolder: (folder: string) => void;
  isInitial?: boolean;
}) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Folder"
            icon={Icon.Desktop}
            onSubmit={(values: { folders: string[] }) => {
              setCachedFolder(values.folders[0]);
              if (!isInitial) {
                pop();
              }
            }}
          />
          <Action
            title="Open Preferences"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
            onAction={() => openCommandPreferences()}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="folders" allowMultipleSelection={false} canChooseDirectories canChooseFiles={false} />
    </Form>
  );
}
