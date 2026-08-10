import { List, Icon } from "@raycast/api";
import { ZendeskTrigger } from "../../api/zendesk";
import { getActiveStatusColor } from "../../utils/colors";
import { formatInstanceColor } from "../../utils/formatters";
import { TimestampMetadata } from "../common/MetadataHelpers";
import { ZendeskActions } from "../actions/ZendeskActions";
import { ZendeskInstance } from "../../utils/preferences";

interface TriggerListItemProps {
  trigger: ZendeskTrigger;
  instance: ZendeskInstance | undefined;
  onInstanceChange: (instance: ZendeskInstance) => void;
  showDetails: boolean;
  onShowDetailsChange: (show: boolean) => void;
  categoryName: string;
}

export function TriggerListItem({
  trigger,
  instance,
  onInstanceChange,
  showDetails,
  onShowDetailsChange,
  categoryName,
}: TriggerListItemProps) {
  return (
    <List.Item
      key={trigger.id}
      title={trigger.title || "Untitled Trigger"}
      icon={undefined}
      accessories={
        !trigger.active
          ? [
              {
                icon: {
                  source: Icon.CircleDisabled,
                },
                tooltip: "Inactive",
              },
            ]
          : []
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              {instance && (
                <>
                  <List.Item.Detail.Metadata.TagList title="Instance">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={instance.subdomain}
                      color={formatInstanceColor(instance.color)}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                </>
              )}
              <List.Item.Detail.Metadata.Label title="Title" text={trigger.title} />
              {trigger.description && (
                <List.Item.Detail.Metadata.Label title="Description" text={trigger.description} />
              )}
              <List.Item.Detail.Metadata.Label title="ID" text={trigger.id.toString()} />
              <List.Item.Detail.Metadata.Label title="Category" text={categoryName} />
              <List.Item.Detail.Metadata.TagList title="Active">
                <List.Item.Detail.Metadata.TagList.Item
                  text={trigger.active ? "Active" : "Inactive"}
                  color={getActiveStatusColor(trigger.active)}
                />
              </List.Item.Detail.Metadata.TagList>
              {trigger.created_at && trigger.updated_at && (
                <TimestampMetadata created_at={trigger.created_at} updated_at={trigger.updated_at} />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ZendeskActions
          item={trigger}
          searchType="triggers"
          instance={instance}
          onInstanceChange={onInstanceChange}
          showDetails={showDetails}
          onShowDetailsChange={onShowDetailsChange}
        />
      }
    />
  );
}
