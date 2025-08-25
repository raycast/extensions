import { List, Icon } from "@raycast/api";
import { ZendeskAutomation } from "../../api/zendesk";
import { getBooleanIcon } from "../../utils/colors";
import { TimestampMetadata } from "../common/MetadataHelpers";
import { ZendeskInstance } from "../../utils/preferences";
import { ZendeskActions } from "../actions/ZendeskActions";

interface AutomationListItemProps {
  automation: ZendeskAutomation;
  instance: ZendeskInstance | undefined;
  onInstanceChange: (instance: ZendeskInstance) => void;
  showDetails: boolean;
  onShowDetailsChange: (show: boolean) => void;
}

export function AutomationListItem({
  automation,
  instance,
  onInstanceChange,
  showDetails,
  onShowDetailsChange,
}: AutomationListItemProps) {
  const accessories: List.Item.Accessory[] = [
    ...(!automation.active ? [{ icon: Icon.CircleDisabled, tooltip: "Inactive" }] : []),
  ];

  return (
    <List.Item
      key={automation.id}
      title={automation.title || "Untitled Automation"}
      accessories={accessories}
      detail={
        showDetails ? (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Automation ID" text={automation.id?.toString() || "N/A"} />
                <List.Item.Detail.Metadata.Label title="Title" text={automation.title || "N/A"} />
                <List.Item.Detail.Metadata.Label title="Position" text={automation.position?.toString() || "N/A"} />

                <List.Item.Detail.Metadata.Separator />

                <List.Item.Detail.Metadata.Label title="Active" icon={getBooleanIcon(automation.active)} />

                <List.Item.Detail.Metadata.Separator />

                <TimestampMetadata created_at={automation.created_at} updated_at={automation.updated_at} />
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
      actions={
        <ZendeskActions
          item={automation}
          searchType="automations"
          instance={instance}
          onInstanceChange={onInstanceChange}
          showDetails={showDetails}
          onShowDetailsChange={onShowDetailsChange}
        />
      }
    />
  );
}
