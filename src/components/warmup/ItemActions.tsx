// components/warmup/ItemActions.tsx
import { Action, ActionPanel } from "@raycast/api";
import { WARMUP_RESOURCES } from "../../constants/warmup";

interface ItemActionsProps {
  setShowingDetail: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ItemActions: React.FC<ItemActionsProps> = ({ setShowingDetail }) => (
  <ActionPanel>
    <Action title="Toggle Detail" onAction={() => setShowingDetail((prev) => !prev)} />
    <Action.OpenInBrowser title="Research Paper" url={WARMUP_RESOURCES.LINKS.RESEARCH} />
    <Action.OpenInBrowser title="Prilepin's Chart" url={WARMUP_RESOURCES.LINKS.PRILEPIN} />
    <Action.OpenInBrowser title="Training Guide" url={WARMUP_RESOURCES.LINKS.GUIDE} />
  </ActionPanel>
);
