import { List } from "@raycast/api";
import { ZendeskGroup } from "../../api/zendesk";
import { getBooleanIcon } from "../../utils/colors";
import { TimestampMetadata } from "../common/MetadataHelpers";
import { ZendeskActions } from "../actions/ZendeskActions";
import { ZendeskInstance } from "../../utils/preferences";

interface GroupListItemProps {
  group: ZendeskGroup;
  instance: ZendeskInstance | undefined;
  onInstanceChange: (instance: ZendeskInstance) => void;
  showDetails: boolean;
  onShowDetailsChange: (show: boolean) => void;
}

export function GroupListItem({
  group,
  instance,
  onInstanceChange,
  showDetails,
  onShowDetailsChange,
}: GroupListItemProps) {
  const nameParts = (group.name ?? "").split(".");
  const title = nameParts.length > 1 ? nameParts.slice(1).join(".") : group.name || "Unknown Group";
  const accessory = nameParts.length > 1 ? nameParts[0] : "";

  return (
    <List.Item
      key={group.id}
      title={title}
      accessories={[{ text: accessory }]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={group.name} />
              <List.Item.Detail.Metadata.Label title="ID" text={group.id.toString()} />
              {group.description && <List.Item.Detail.Metadata.Label title="Description" text={group.description} />}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Default" icon={getBooleanIcon(group.default)} />
              <List.Item.Detail.Metadata.Label title="Deleted" icon={getBooleanIcon(group.deleted)} />
              <List.Item.Detail.Metadata.Label title="Is Public" icon={getBooleanIcon(group.is_public)} />
              <List.Item.Detail.Metadata.Separator />
              <TimestampMetadata created_at={group.created_at} updated_at={group.updated_at} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ZendeskActions
          item={group}
          searchType="groups"
          instance={instance}
          onInstanceChange={onInstanceChange}
          showDetails={showDetails}
          onShowDetailsChange={onShowDetailsChange}
        />
      }
    />
  );
}
