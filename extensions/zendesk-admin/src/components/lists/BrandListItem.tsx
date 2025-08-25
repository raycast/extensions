import { List, Icon, Color } from "@raycast/api";
import { ZendeskBrand, ZendeskInstance } from "../../api/zendesk";
import { getActiveStatusColor, getDefaultStatusColor, getHelpCenterStateColor } from "../../utils/colors";
import { TimestampMetadata } from "../common/MetadataHelpers";
import { ZendeskActions } from "../actions/ZendeskActions";

interface BrandListItemProps {
  brand: ZendeskBrand;
  instance: ZendeskInstance | undefined;
  onInstanceChange: (instance: ZendeskInstance) => void;
  showDetails: boolean;
  onShowDetailsChange: (show: boolean) => void;
}

export function BrandListItem({
  brand,
  instance,
  onInstanceChange,
  showDetails,
  onShowDetailsChange,
}: BrandListItemProps) {
  const accessories: List.Item.Accessory[] = [
    ...(brand.default ? [{ icon: Icon.CheckCircle, tooltip: "Default Brand" }] : []),
    ...(!showDetails ? [{ text: brand.subdomain || "No subdomain" }] : []),
  ];

  return (
    <List.Item
      key={brand.id}
      title={brand.name || "Unknown Brand"}
      icon={brand.logo ? { source: brand.logo.content_url } : Icon.Tag}
      accessories={accessories}
      detail={
        showDetails ? (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Brand ID" text={brand.id?.toString() || "N/A"} />
                <List.Item.Detail.Metadata.Label title="Name" text={brand.name || "N/A"} />
                <List.Item.Detail.Metadata.Label title="Subdomain" text={brand.subdomain || "N/A"} />
                <List.Item.Detail.Metadata.Label title="Host Mapping" text={brand.host_mapping || "N/A"} />
                {brand.brand_url && (
                  <List.Item.Detail.Metadata.Link title="Brand URL" text={brand.brand_url} target={brand.brand_url} />
                )}

                <List.Item.Detail.Metadata.Separator />

                <List.Item.Detail.Metadata.TagList title="Status">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={brand.active ? "Active" : "Inactive"}
                    color={getActiveStatusColor(brand.active)}
                  />
                </List.Item.Detail.Metadata.TagList>

                <List.Item.Detail.Metadata.TagList title="Default">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={brand.default ? "Default" : "Not Default"}
                    color={getDefaultStatusColor(brand.default)}
                  />
                </List.Item.Detail.Metadata.TagList>

                <List.Item.Detail.Metadata.TagList title="Help Center">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={brand.has_help_center ? "Enabled" : "Disabled"}
                    color={getActiveStatusColor(brand.has_help_center)}
                  />
                </List.Item.Detail.Metadata.TagList>

                {brand.help_center_state && (
                  <List.Item.Detail.Metadata.TagList title="Help Center State">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={brand.help_center_state}
                      color={getHelpCenterStateColor(brand.help_center_state)}
                    />
                  </List.Item.Detail.Metadata.TagList>
                )}

                <List.Item.Detail.Metadata.Separator />

                {brand.ticket_form_ids && brand.ticket_form_ids.length > 0 && (
                  <List.Item.Detail.Metadata.TagList title="Ticket Forms">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={`${brand.ticket_form_ids.length} form(s)`}
                      color={Color.Blue}
                    />
                  </List.Item.Detail.Metadata.TagList>
                )}

                <List.Item.Detail.Metadata.Separator />

                <TimestampMetadata created_at={brand.created_at} updated_at={brand.updated_at} />
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
      actions={
        <ZendeskActions
          item={brand}
          searchType="brands"
          instance={instance}
          onInstanceChange={onInstanceChange}
          showDetails={showDetails}
          onShowDetailsChange={onShowDetailsChange}
        />
      }
    />
  );
}
