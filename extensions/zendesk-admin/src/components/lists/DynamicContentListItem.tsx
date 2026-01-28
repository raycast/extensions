import { List } from "@raycast/api";
import { ZendeskDynamicContent } from "../../api/zendesk";
import { TimestampMetadata } from "../common/MetadataHelpers";
import { ZendeskActions } from "../actions/ZendeskActions";
import { ZendeskInstance } from "../../utils/preferences";
import { formatDynamicContent } from "../../utils/formatters";

interface DynamicContentListItemProps {
  dynamicContent: ZendeskDynamicContent;
  instance: ZendeskInstance | undefined;
  onInstanceChange: (instance: ZendeskInstance) => void;
  showDetails: boolean;
  onShowDetailsChange: (show: boolean) => void;
}

export function DynamicContentListItem({
  dynamicContent,
  instance,
  onInstanceChange,
  showDetails,
  onShowDetailsChange,
}: DynamicContentListItemProps) {
  const nameParts = (dynamicContent.name ?? "").split("::");
  const title =
    nameParts?.length > 1 ? nameParts[nameParts.length - 1] : dynamicContent.name || "Unknown Dynamic Content";
  const tags = nameParts?.length > 1 ? nameParts.slice(0, nameParts.length - 1) : [];
  const defaultVariant = dynamicContent.variants?.find((v) => v.default === true);

  // Format the content using our new utility function
  const formattedContent = defaultVariant
    ? formatDynamicContent(defaultVariant.content.replace(/\r\n|\r|\n/g, "\n"))
    : "No default variant content available.";

  return (
    <List.Item
      key={dynamicContent.id}
      title={title}
      accessories={
        tags.length > 2
          ? [...tags.slice(0, 2).map((tag) => ({ text: tag })), { text: "..." }]
          : tags.map((tag) => ({ text: tag }))
      }
      detail={
        <List.Item.Detail
          markdown={formattedContent}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={dynamicContent.name} />
              <List.Item.Detail.Metadata.Label title="ID" text={dynamicContent.id.toString()} />
              <List.Item.Detail.Metadata.Label title="Placeholder" text={dynamicContent.placeholder} />
              <TimestampMetadata created_at={dynamicContent.created_at} updated_at={dynamicContent.updated_at} />
              <List.Item.Detail.Metadata.TagList title="Locales">
                {dynamicContent.variants?.map((variant) => (
                  <List.Item.Detail.Metadata.TagList.Item key={variant.id} text={`${variant.locale_id}`} />
                ))}
              </List.Item.Detail.Metadata.TagList>
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ZendeskActions
          item={dynamicContent}
          searchType="dynamic_content"
          instance={instance}
          onInstanceChange={onInstanceChange}
          showDetails={showDetails}
          onShowDetailsChange={onShowDetailsChange}
        />
      }
    />
  );
}
