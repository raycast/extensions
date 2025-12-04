import { List, Image, Icon } from "@raycast/api";
import { ZendeskUser } from "../../api/zendesk";
import { getUserRoleColor } from "../../utils/colors";
import { TimestampMetadata } from "../common/MetadataHelpers";
import { ZendeskActions } from "../actions/ZendeskActions";
import { ZendeskInstance } from "../../utils/preferences";

interface UserListItemProps {
  user: ZendeskUser;
  instance: ZendeskInstance | undefined;
  onInstanceChange: (instance: ZendeskInstance) => void;
  showDetails: boolean;
  onShowDetailsChange: (show: boolean) => void;
}

export function UserListItem({
  user,
  instance,
  onInstanceChange,
  showDetails,
  onShowDetailsChange,
}: UserListItemProps) {
  const hasDetailsOrNotes = user.details || user.notes;
  const hasTimestamps = user.created_at || user.updated_at;

  return (
    <List.Item
      key={user.id}
      title={user.name || "Unknown User"}
      icon={
        user.photo?.content_url
          ? { source: user.photo.content_url, mask: Image.Mask.Circle }
          : { source: "placeholder-user.svg", mask: Image.Mask.Circle }
      }
      accessories={[
        ...(user.role && (user.role === "agent" || user.role === "admin")
          ? [
              {
                icon: {
                  source: Icon.Person,
                  tintColor: getUserRoleColor(user.role),
                },
                tooltip: user.role === "agent" ? "Agent" : "Admin",
              },
            ]
          : []),
        ...(!showDetails && user.email ? [{ text: user.email }] : []),
      ]}
      detail={
        showDetails ? (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Name" text={user.name} />
                <List.Item.Detail.Metadata.Label title="ID" text={user.id.toString()} />
                {user.email && (
                  <List.Item.Detail.Metadata.Link title="Email" text={user.email} target={`mailto:${user.email}`} />
                )}
                {user.alias && <List.Item.Detail.Metadata.Label title="Alias" text={user.alias} />}
                {user.phone && <List.Item.Detail.Metadata.Label title="Phone" text={user.phone} />}
                {user.role && (
                  <List.Item.Detail.Metadata.TagList title="Role">
                    <List.Item.Detail.Metadata.TagList.Item text={user.role} color={getUserRoleColor(user.role)} />
                  </List.Item.Detail.Metadata.TagList>
                )}
                {user.tags && user.tags.length > 0 && (
                  <List.Item.Detail.Metadata.TagList title="Tags">
                    {user.tags.map((tag) => (
                      <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                )}

                {hasDetailsOrNotes && (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    {user.details && <List.Item.Detail.Metadata.Label title="Details" text={user.details} />}
                    {user.notes && <List.Item.Detail.Metadata.Label title="Notes" text={user.notes} />}
                  </>
                )}

                {hasTimestamps && (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    {user.created_at && user.updated_at && (
                      <TimestampMetadata created_at={user.created_at} updated_at={user.updated_at} />
                    )}
                  </>
                )}
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
      actions={
        <ZendeskActions
          item={user}
          searchType="users"
          instance={instance}
          onInstanceChange={onInstanceChange}
          showDetails={showDetails}
          onShowDetailsChange={onShowDetailsChange}
        />
      }
    />
  );
}
