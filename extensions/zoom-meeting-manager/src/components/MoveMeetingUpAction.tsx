import { Action, Icon } from "@raycast/api";

function MoveMeetingUpAction(props: { onMoveUp: () => void }) {
  return (
    <Action
      icon={Icon.ArrowUp}
      title="Move Meeting Up"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
      onAction={props.onMoveUp}
    />
  );
}

export default MoveMeetingUpAction;
