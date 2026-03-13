import { Action, Icon, Keyboard } from "@raycast/api";

interface FavoriteToggleActionProps {
  isFavorite: boolean;
  onToggle: () => void;
}

export function FavoriteToggleAction({ isFavorite, onToggle }: FavoriteToggleActionProps) {
  return (
    <Action
      title={`${isFavorite ? "Remove from" : "Add to"} Favorites`}
      icon={isFavorite ? Icon.StarDisabled : Icon.Star}
      shortcut={Keyboard.Shortcut.Common.Pin}
      onAction={onToggle}
    />
  );
}
