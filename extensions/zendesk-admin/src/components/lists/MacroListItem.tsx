import { List, Icon } from "@raycast/api";
import { ZendeskMacro } from "../../api/zendesk";
import { getActiveStatusColor } from "../../utils/colors";
import { TimestampMetadata } from "../common/MetadataHelpers";
import { ZendeskActions } from "../actions/ZendeskActions";
import { ZendeskInstance } from "../../utils/preferences";

interface MacroListItemProps {
  macro: ZendeskMacro;
  instance: ZendeskInstance | undefined;
  onInstanceChange: (instance: ZendeskInstance) => void;
  showDetails: boolean;
  onShowDetailsChange: (show: boolean) => void;
}

export function MacroListItem({
  macro,
  instance,
  onInstanceChange,
  showDetails,
  onShowDetailsChange,
}: MacroListItemProps) {
  const nameParts = macro.title?.split("::");
  const title = nameParts?.length > 1 ? nameParts[nameParts.length - 1] : macro.title || "Untitled Macro";
  const tags = nameParts?.length > 1 ? nameParts.slice(0, nameParts.length - 1) : [];

  return (
    <List.Item
      key={macro.id}
      title={title}
      accessories={[
        ...(tags.length > 2
          ? [...tags.slice(0, 2).map((tag) => ({ text: tag })), { text: "..." }]
          : tags.map((tag) => ({ text: tag }))),
        ...(!macro.active
          ? [
              {
                icon: {
                  source: Icon.CircleDisabled,
                },
                tooltip: "Inactive",
              },
            ]
          : []),
      ]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={macro.title} />
              <List.Item.Detail.Metadata.Label title="ID" text={macro.id.toString()} />
              <List.Item.Detail.Metadata.TagList title="Active">
                <List.Item.Detail.Metadata.TagList.Item
                  text={macro.active ? "Active" : "Inactive"}
                  color={getActiveStatusColor(macro.active)}
                />
              </List.Item.Detail.Metadata.TagList>
              {macro.description && <List.Item.Detail.Metadata.Label title="Description" text={macro.description} />}
              <TimestampMetadata created_at={macro.created_at} updated_at={macro.updated_at} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ZendeskActions
          item={macro}
          searchType="macros"
          instance={instance}
          onInstanceChange={onInstanceChange}
          showDetails={showDetails}
          onShowDetailsChange={onShowDetailsChange}
        />
      }
    />
  );
}
