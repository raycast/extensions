import { List, Icon } from "@raycast/api";
import { ZendeskTicketField } from "../../api/zendesk";
import { getActiveStatusColor, getBooleanIcon } from "../../utils/colors";
import { getFieldTypeInfo } from "../../utils/fieldTypes";
import { TimestampMetadata } from "../common/MetadataHelpers";
import { ZendeskActions } from "../actions/ZendeskActions";
import { ZendeskInstance } from "../../utils/preferences";

interface TicketFieldListItemProps {
  ticketField: ZendeskTicketField;
  instance: ZendeskInstance | undefined;
  onInstanceChange: (instance: ZendeskInstance) => void;
  showDetails: boolean;
  onShowDetailsChange: (show: boolean) => void;
}

export function TicketFieldListItem({
  ticketField,
  instance,
  onInstanceChange,
  showDetails,
  onShowDetailsChange,
}: TicketFieldListItemProps) {
  if (!ticketField) {
    return null; // Skip rendering if ticketField is null or undefined
  }
  const fieldTypeInfo = getFieldTypeInfo(ticketField.type);

  return (
    <List.Item
      key={ticketField.id}
      title={ticketField.title || "Untitled Field"}
      accessories={[
        {
          tag: {
            value: fieldTypeInfo.label,
            color: fieldTypeInfo.color,
          },
        },
        ...(!ticketField.active
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
              <List.Item.Detail.Metadata.Label title="Title" text={ticketField.title} />
              <List.Item.Detail.Metadata.Label title="ID" text={ticketField.id.toString()} />
              <List.Item.Detail.Metadata.TagList title="Type">
                <List.Item.Detail.Metadata.TagList.Item text={fieldTypeInfo.label} color={fieldTypeInfo.color} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Active">
                <List.Item.Detail.Metadata.TagList.Item
                  text={ticketField.active ? "Active" : "Inactive"}
                  color={getActiveStatusColor(ticketField.active)}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Visible in Portal"
                icon={getBooleanIcon(ticketField.visible_in_portal)}
              />
              <List.Item.Detail.Metadata.Label
                title="Editable in Portal"
                icon={getBooleanIcon(ticketField.editable_in_portal)}
              />
              <List.Item.Detail.Metadata.Label
                title="Required in Portal"
                icon={getBooleanIcon(ticketField.required_in_portal)}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Agent Can Edit"
                icon={getBooleanIcon(ticketField.editable_in_portal)}
              />
              <List.Item.Detail.Metadata.Separator />
              {ticketField.tag && <List.Item.Detail.Metadata.Label title="Tag" text={ticketField.tag} />}
              <TimestampMetadata created_at={ticketField.created_at} updated_at={ticketField.updated_at} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ZendeskActions
          item={ticketField}
          searchType="ticket_fields"
          instance={instance}
          onInstanceChange={onInstanceChange}
          showDetails={showDetails}
          onShowDetailsChange={onShowDetailsChange}
        />
      }
    />
  );
}
