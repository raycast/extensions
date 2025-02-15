// components/max/ItemActions.tsx
import { Action, ActionPanel } from "@raycast/api";
import { RESOURCES } from "../../constants/shared";

interface ItemActionsProps {
  setShowingDetail: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ItemActions: React.FC<ItemActionsProps> = ({ setShowingDetail }) => (
  <ActionPanel>
    <Action title="Toggle Detail" onAction={() => setShowingDetail((prev) => !prev)} />
    <Action.OpenInBrowser title="Learn More" url={RESOURCES.LINKS.WIKI} />
  </ActionPanel>
);
