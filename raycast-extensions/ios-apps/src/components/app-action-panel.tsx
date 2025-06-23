import { ActionPanel, Action, Icon } from "@raycast/api";
import { AppDetails } from "../types";
import { AppActions } from "./app-actions";
import { CopyActions } from "./copy-actions";
import AppDetailView from "../app-detail-view";

interface AppActionPanelProps {
  app: AppDetails;
  onDownload?: (app: AppDetails) => Promise<string | null | undefined>;
  showViewDetails?: boolean;
}

/**
 * Reusable ActionPanel component for app-related actions
 */
export function AppActionPanel({ app, onDownload, showViewDetails = true }: AppActionPanelProps) {
  return (
    <ActionPanel>
      {showViewDetails && <Action.Push title="View Details" icon={Icon.Eye} target={<AppDetailView app={app} />} />}
      <AppActions app={app} onDownload={onDownload} />
      <CopyActions app={app} />
    </ActionPanel>
  );
}
