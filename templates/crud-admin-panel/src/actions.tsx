import { ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { deleteUser, User } from "./api";
import UserDetail from "./detail";
import UserForm from "./form";

export default function UserActions(props: {
  user: User;
  showDetail?: boolean;
  onUpdateUser: () => void;
  onDeleteUser: () => void;
}) {
  async function handleDeleteUser() {
    await showToast({ style: Toast.Style.Animated, title: "Deleting user" });

    try {
      await deleteUser(props.user);
      await showToast({ style: Toast.Style.Success, title: "Deleted user" });

      props.onDeleteUser();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed deleting user",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {props.showDetail && (
          <Action.Push icon={Icon.Sidebar} title="Read User" target={<UserDetail user={props.user} />} />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Email" content={props.user.email} />
        <Action.CopyToClipboard title="Copy Name" content={`${props.user.firstName} ${props.user.lastName}`} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          icon={Icon.Pencil}
          title="Update User"
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={<UserForm title="Update User" user={props.user} onPop={props.onUpdateUser} />}
        />
        <Action
          icon={Icon.Trash}
          title="Delete User"
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={handleDeleteUser}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
