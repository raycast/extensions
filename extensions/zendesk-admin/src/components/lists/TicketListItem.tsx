import { List } from "@raycast/api";
import { ZendeskTicket, ZendeskInstance } from "../../api/zendesk";
import { ZendeskActions } from "../actions/ZendeskActions";
import { getStatusColor, getPriorityColor, getTicketTypeColor, getTicketTypeText } from "../../utils/colors";
import { TimestampMetadata } from "../common/MetadataHelpers";
import { getViaChannelInfo } from "../../utils/viaChannelMapping";

interface TicketListItemProps {
  ticket: ZendeskTicket;
  instance: ZendeskInstance | undefined;
  onInstanceChange: (instance: ZendeskInstance) => void;
  showDetails?: boolean;
  onShowDetailsChange?: (show: boolean) => void;
}

export function TicketListItem({
  ticket,
  instance,
  onInstanceChange,
  showDetails,
  onShowDetailsChange,
}: TicketListItemProps) {
  const statusColor = getStatusColor(ticket.status);
  const priorityColor = getPriorityColor(ticket.priority);
  const ticketTypeColor = getTicketTypeColor(ticket.type);
  const ticketTypeText = getTicketTypeText(ticket.type);

  return (
    <List.Item
      key={ticket.id}
      title={ticket.subject || "Untitled Ticket"}
      accessories={[{ tag: { value: `#${ticket.id}`, color: statusColor } }]}
      detail={
        <List.Item.Detail
          markdown={`## ${ticket.subject}\n\n${ticket.description}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item text={ticket.status} color={statusColor} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Associations">
                {ticket.requester_id && (
                  <List.Item.Detail.Metadata.TagList.Item text={`Requester: ${ticket.requester_id}`} />
                )}
                {ticket.organization_id && (
                  <List.Item.Detail.Metadata.TagList.Item text={`Organization: ${ticket.organization_id}`} />
                )}
                {ticket.brand_id && <List.Item.Detail.Metadata.TagList.Item text={`Brand: ${ticket.brand_id}`} />}
                {ticket.group_id && <List.Item.Detail.Metadata.TagList.Item text={`Group: ${ticket.group_id}`} />}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <TimestampMetadata created_at={ticket.created_at} updated_at={ticket.updated_at} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Custom Fields">
                {ticket.custom_fields
                  ?.filter((field) => field && field.value) // Add null check for field
                  ?.map((field) => (
                    <List.Item.Detail.Metadata.TagList.Item key={field.id} text={`${field.id}: ${field.value}`} />
                  ))}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              {ticket.external_id && <List.Item.Detail.Metadata.Label title="External ID" text={ticket.external_id} />}
              {ticket.recipient && <List.Item.Detail.Metadata.Label title="Recipient" text={ticket.recipient} />}
              {ticket.tags && ticket.tags.length > 0 && (
                <List.Item.Detail.Metadata.TagList title="Tags">
                  {ticket.tags.map((tag) => (
                    <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              )}
              {ticket.ticket_form_id && (
                <List.Item.Detail.Metadata.Label title="Ticket Form ID" text={String(ticket.ticket_form_id)} />
              )}
              {ticket.priority && (
                <List.Item.Detail.Metadata.TagList title="Priority">
                  <List.Item.Detail.Metadata.TagList.Item text={ticket.priority} color={priorityColor} />
                </List.Item.Detail.Metadata.TagList>
              )}
              {ticket.type && (
                <List.Item.Detail.Metadata.TagList title="Type">
                  <List.Item.Detail.Metadata.TagList.Item text={ticketTypeText} color={ticketTypeColor} />
                </List.Item.Detail.Metadata.TagList>
              )}
              {ticket.via && (
                <List.Item.Detail.Metadata.TagList title="Via">
                  {(() => {
                    const viaInfo = getViaChannelInfo(ticket.via.channel);
                    return <List.Item.Detail.Metadata.TagList.Item text={viaInfo.label} icon={viaInfo.icon} />;
                  })()}
                </List.Item.Detail.Metadata.TagList>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ZendeskActions
          item={ticket}
          searchType="tickets"
          instance={instance}
          onInstanceChange={onInstanceChange}
          showDetails={showDetails}
          onShowDetailsChange={onShowDetailsChange}
        />
      }
    />
  );
}
