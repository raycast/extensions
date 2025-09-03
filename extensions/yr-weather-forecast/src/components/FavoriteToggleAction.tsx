import { Action, Icon, Keyboard } from "@raycast/api";

export function FavoriteToggleAction(props: { isFavorite: boolean; onToggle: () => void }) {
  const { isFavorite, onToggle } = props;
  return (
    <Action
      title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
      icon={isFavorite ? Icon.StarDisabled : Icon.Star}
      shortcut={Keyboard.Shortcut.Common.Pin}
      onAction={onToggle}
    />
  );
}
