import { List, Icon } from "@raycast/api";
import { ZendeskView } from "../../api/zendesk";
import { getActiveStatusColor } from "../../utils/colors";
import { TimestampMetadata } from "../common/MetadataHelpers";
import { ZendeskActions } from "../actions/ZendeskActions";
import { ZendeskInstance } from "../../utils/preferences";

interface ViewListItemProps {
  view: ZendeskView;
  instance: ZendeskInstance | undefined;
  onInstanceChange: (instance: ZendeskInstance) => void;
  showDetails: boolean;
  onShowDetailsChange: (show: boolean) => void;
}

export function ViewListItem({
  view,
  instance,
  onInstanceChange,
  showDetails,
  onShowDetailsChange,
}: ViewListItemProps) {
  return (
    <List.Item
      key={view.id}
      title={view.title || "Untitled View"}
      icon={undefined}
      accessories={
        !view.active
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
              <List.Item.Detail.Metadata.Label title="Title" text={view.title} />
              <List.Item.Detail.Metadata.Label title="ID" text={view.id.toString()} />
              <List.Item.Detail.Metadata.TagList title="Active">
                <List.Item.Detail.Metadata.TagList.Item
                  text={view.active ? "Active" : "Inactive"}
                  color={getActiveStatusColor(view.active)}
                />
              </List.Item.Detail.Metadata.TagList>
              {view.created_at && view.updated_at && (
                <TimestampMetadata created_at={view.created_at} updated_at={view.updated_at} />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ZendeskActions
          item={view}
          searchType="views"
          instance={instance}
          onInstanceChange={onInstanceChange}
          showDetails={showDetails}
          onShowDetailsChange={onShowDetailsChange}
        />
      }
    />
  );
}
