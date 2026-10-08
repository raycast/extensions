import { List, Icon, Color } from "@raycast/api";
import { ZendeskCustomRole, ZendeskInstance } from "../../api/zendesk";
import { getActiveStatusColor, getRoleAccessLevelColor, getRoleAccessLevelText } from "../../utils/colors";
import { TimestampMetadata } from "../common/MetadataHelpers";
import { ZendeskActions } from "../actions/ZendeskActions";

interface CustomRoleListItemProps {
  customRole: ZendeskCustomRole;
  instance: ZendeskInstance | undefined;
  onInstanceChange: (instance: ZendeskInstance) => void;
  showDetails: boolean;
  onShowDetailsChange: (show: boolean) => void;
}

export function CustomRoleListItem({
  customRole,
  instance,
  onInstanceChange,
  showDetails,
  onShowDetailsChange,
}: CustomRoleListItemProps) {
  const accessories: List.Item.Accessory[] = [
    ...(customRole.team_member_count > 0 ? [{ text: `${customRole.team_member_count}` }, { icon: Icon.Person }] : []),
  ];

  return (
    <List.Item
      key={customRole.id}
      title={customRole.name || "Unknown Role"}
      accessories={accessories}
      detail={
        showDetails ? (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Role ID" text={customRole.id?.toString() || "N/A"} />
                <List.Item.Detail.Metadata.Label title="Name" text={customRole.name || "N/A"} />
                <List.Item.Detail.Metadata.Label title="Description" text={customRole.description || "N/A"} />
                <List.Item.Detail.Metadata.Label title="Role Type" text={customRole.role_type?.toString() || "N/A"} />
                <List.Item.Detail.Metadata.Label
                  title="Team Members"
                  text={customRole.team_member_count?.toString() || "0"}
                />

                <List.Item.Detail.Metadata.Separator />

                <List.Item.Detail.Metadata.TagList title="Access Levels">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={getRoleAccessLevelText(customRole.configuration?.ticket_access || "none")}
                    color={getRoleAccessLevelColor(customRole.configuration?.ticket_access || "none")}
                  />
                  <List.Item.Detail.Metadata.TagList.Item
                    text={getRoleAccessLevelText(customRole.configuration?.ticket_comment_access || "none")}
                    color={getRoleAccessLevelColor(customRole.configuration?.ticket_comment_access || "none")}
                  />
                  <List.Item.Detail.Metadata.TagList.Item
                    text={getRoleAccessLevelText(customRole.configuration?.view_access || "none")}
                    color={getRoleAccessLevelColor(customRole.configuration?.view_access || "none")}
                  />
                  <List.Item.Detail.Metadata.TagList.Item
                    text={getRoleAccessLevelText(customRole.configuration?.report_access || "none")}
                    color={getRoleAccessLevelColor(customRole.configuration?.report_access || "none")}
                  />
                  <List.Item.Detail.Metadata.TagList.Item
                    text={getRoleAccessLevelText(customRole.configuration?.user_view_access || "none")}
                    color={getRoleAccessLevelColor(customRole.configuration?.user_view_access || "none")}
                  />
                </List.Item.Detail.Metadata.TagList>

                <List.Item.Detail.Metadata.Separator />

                <List.Item.Detail.Metadata.TagList title="Ticket Permissions">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={customRole.configuration?.ticket_editing ? "Can Edit" : "Cannot Edit"}
                    color={getActiveStatusColor(customRole.configuration?.ticket_editing || false)}
                  />
                  <List.Item.Detail.Metadata.TagList.Item
                    text={customRole.configuration?.ticket_deletion ? "Can Delete" : "Cannot Delete"}
                    color={getActiveStatusColor(customRole.configuration?.ticket_deletion || false)}
                  />
                  <List.Item.Detail.Metadata.TagList.Item
                    text={customRole.configuration?.ticket_merge ? "Can Merge" : "Cannot Merge"}
                    color={getActiveStatusColor(customRole.configuration?.ticket_merge || false)}
                  />
                  <List.Item.Detail.Metadata.TagList.Item
                    text={customRole.configuration?.ticket_tag_editing ? "Can Edit Tags" : "Cannot Edit Tags"}
                    color={getActiveStatusColor(customRole.configuration?.ticket_tag_editing || false)}
                  />
                </List.Item.Detail.Metadata.TagList>

                <List.Item.Detail.Metadata.Separator />

                <List.Item.Detail.Metadata.TagList title="System Access">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={customRole.configuration?.group_access ? "Group Access" : "No Group Access"}
                    color={getActiveStatusColor(customRole.configuration?.group_access || false)}
                  />
                  <List.Item.Detail.Metadata.TagList.Item
                    text={customRole.configuration?.chat_access ? "Chat Access" : "No Chat Access"}
                    color={getActiveStatusColor(customRole.configuration?.chat_access || false)}
                  />
                  <List.Item.Detail.Metadata.TagList.Item
                    text={customRole.configuration?.voice_access ? "Voice Access" : "No Voice Access"}
                    color={getActiveStatusColor(customRole.configuration?.voice_access || false)}
                  />
                  <List.Item.Detail.Metadata.TagList.Item
                    text={customRole.configuration?.light_agent ? "Light Agent" : "Full Agent"}
                    color={customRole.configuration?.light_agent ? Color.Orange : Color.Green}
                  />
                </List.Item.Detail.Metadata.TagList>

                <List.Item.Detail.Metadata.Separator />

                <List.Item.Detail.Metadata.TagList title="Management Permissions">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={customRole.configuration?.manage_business_rules ? "Business Rules" : "No Business Rules"}
                    color={getActiveStatusColor(customRole.configuration?.manage_business_rules || false)}
                  />
                  <List.Item.Detail.Metadata.TagList.Item
                    text={
                      customRole.configuration?.manage_extensions_and_channels
                        ? "Extensions & Channels"
                        : "No Extensions"
                    }
                    color={getActiveStatusColor(customRole.configuration?.manage_extensions_and_channels || false)}
                  />
                  <List.Item.Detail.Metadata.TagList.Item
                    text={customRole.configuration?.manage_ticket_fields ? "Ticket Fields" : "No Ticket Fields"}
                    color={getActiveStatusColor(customRole.configuration?.manage_ticket_fields || false)}
                  />
                  <List.Item.Detail.Metadata.TagList.Item
                    text={customRole.configuration?.manage_ticket_forms ? "Ticket Forms" : "No Ticket Forms"}
                    color={getActiveStatusColor(customRole.configuration?.manage_ticket_forms || false)}
                  />
                </List.Item.Detail.Metadata.TagList>

                <List.Item.Detail.Metadata.Separator />

                <List.Item.Detail.Metadata.TagList title="End User Access">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={getRoleAccessLevelText(customRole.configuration?.end_user_list_access || "none")}
                    color={getRoleAccessLevelColor(customRole.configuration?.end_user_list_access || "none")}
                  />
                  <List.Item.Detail.Metadata.TagList.Item
                    text={getRoleAccessLevelText(customRole.configuration?.end_user_profile_access || "none")}
                    color={getRoleAccessLevelColor(customRole.configuration?.end_user_profile_access || "none")}
                  />
                </List.Item.Detail.Metadata.TagList>

                <List.Item.Detail.Metadata.Separator />

                <List.Item.Detail.Metadata.TagList title="Additional Access Levels">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={getRoleAccessLevelText(customRole.configuration?.explore_access || "none")}
                    color={getRoleAccessLevelColor(customRole.configuration?.explore_access || "none")}
                  />
                  <List.Item.Detail.Metadata.TagList.Item
                    text={getRoleAccessLevelText(customRole.configuration?.forum_access || "none")}
                    color={getRoleAccessLevelColor(customRole.configuration?.forum_access || "none")}
                  />
                  <List.Item.Detail.Metadata.TagList.Item
                    text={getRoleAccessLevelText(customRole.configuration?.macro_access || "none")}
                    color={getRoleAccessLevelColor(customRole.configuration?.macro_access || "none")}
                  />
                </List.Item.Detail.Metadata.TagList>

                <List.Item.Detail.Metadata.Separator />

                <TimestampMetadata created_at={customRole.created_at} updated_at={customRole.updated_at} />
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
      actions={
        <ZendeskActions
          item={customRole}
          searchType="custom_roles"
          instance={instance}
          onInstanceChange={onInstanceChange}
          showDetails={showDetails}
          onShowDetailsChange={onShowDetailsChange}
        />
      }
    />
  );
}
