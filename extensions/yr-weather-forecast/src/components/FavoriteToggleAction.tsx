import { Action, Icon } from "@raycast/api";

interface FavoriteToggleActionProps {
  isFavorite: boolean;
  onToggle: () => void;
}

export function FavoriteToggleAction({ isFavorite, onToggle }: FavoriteToggleActionProps) {
  return (
    <Action
      title={`${isFavorite ? "Remove from" : "Add to"} Favorites`}
      icon={isFavorite ? Icon.StarDisabled : Icon.Star}
      shortcut={isFavorite ? { modifiers: ["cmd", "shift"], key: "f" } : { modifiers: ["cmd"], key: "f" }}
      onAction={onToggle}
    />
  );
}
