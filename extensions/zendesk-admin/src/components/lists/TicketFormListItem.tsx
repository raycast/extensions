import { List, Icon } from "@raycast/api";
import { ZendeskTicketForm } from "../../api/zendesk";
import { getActiveStatusColor, getBooleanIcon } from "../../utils/colors";
import { TimestampMetadata } from "../common/MetadataHelpers";
import { ZendeskActions } from "../actions/ZendeskActions";
import { ZendeskInstance } from "../../utils/preferences";

interface TicketFormListItemProps {
  ticketForm: ZendeskTicketForm;
  instance: ZendeskInstance | undefined;
  onInstanceChange: (instance: ZendeskInstance) => void;
  showDetails: boolean;
  onShowDetailsChange: (show: boolean) => void;
}

export function TicketFormListItem({
  ticketForm,
  instance,
  onInstanceChange,
  showDetails,
  onShowDetailsChange,
}: TicketFormListItemProps) {
  return (
    <List.Item
      key={ticketForm.id}
      title={ticketForm.name || "Untitled Form"}
      accessories={
        !ticketForm.active
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
              <List.Item.Detail.Metadata.Label title="Name" text={ticketForm.name} />
              {ticketForm.display_name && (
                <List.Item.Detail.Metadata.Label title="Display Name" text={ticketForm.display_name} />
              )}
              <List.Item.Detail.Metadata.Label title="ID" text={ticketForm.id.toString()} />
              <List.Item.Detail.Metadata.TagList title="Active">
                <List.Item.Detail.Metadata.TagList.Item
                  text={ticketForm.active ? "Active" : "Inactive"}
                  color={getActiveStatusColor(ticketForm.active)}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="End User Visible"
                icon={getBooleanIcon(ticketForm.end_user_visible)}
              />
              <List.Item.Detail.Metadata.Label title="In All Brands" icon={getBooleanIcon(ticketForm.in_all_brands)} />
              {ticketForm.restricted_brand_ids && ticketForm.restricted_brand_ids.length > 0 && (
                <List.Item.Detail.Metadata.TagList title="Restricted Brand IDs">
                  {ticketForm.restricted_brand_ids.map((brandId) => (
                    <List.Item.Detail.Metadata.TagList.Item key={brandId} text={brandId.toString()} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              )}
              <List.Item.Detail.Metadata.Separator />
              <TimestampMetadata created_at={ticketForm.created_at} updated_at={ticketForm.updated_at} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ZendeskActions
          item={ticketForm}
          searchType="ticket_forms"
          instance={instance}
          onInstanceChange={onInstanceChange}
          showDetails={showDetails}
          onShowDetailsChange={onShowDetailsChange}
        />
      }
    />
  );
}
