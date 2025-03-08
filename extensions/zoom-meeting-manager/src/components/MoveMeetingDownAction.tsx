import { Action, Icon } from "@raycast/api";

function MoveMeetingDownAction(props: { onMoveDown: () => void }) {
  return (
    <Action
      icon={Icon.ArrowDown}
      title="Move Meeting Down"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
      onAction={props.onMoveDown}
    />
  );
}

export default MoveMeetingDownAction;
