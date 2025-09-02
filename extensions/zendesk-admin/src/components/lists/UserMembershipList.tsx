import { List, Color, Icon, Image } from "@raycast/api";
import { getUserRoleColor, getDefaultStatusColor } from "../../utils/colors";
import { TimestampMetadata } from "../common/MetadataHelpers";
import { useEntitySearch } from "../../hooks/useEntitySearch";
import { ZendeskInstance } from "../../utils/preferences";
import {
  searchZendeskGroupMemberships,
  ZendeskGroupMembership,
  getGroupUsers,
  ZendeskUser,
  searchZendeskUsers,
} from "../../api/zendesk";
import { ZendeskActions } from "../actions/ZendeskActions";
import { useState } from "react";
import { truncateText, TRUNCATION_CONSTANTS } from "../../utils/formatters";

interface UserMembershipListProps {
  entityId: number;
  entityName: string;
  entityType: "group" | "role";
  instance: ZendeskInstance | undefined;
}

interface MembershipWithUser extends ZendeskGroupMembership {
  user?: ZendeskUser;
}

interface UserWithMembership extends ZendeskUser {
  membership?: ZendeskGroupMembership;
}

export default function UserMembershipList({ entityId, entityName, entityType, instance }: UserMembershipListProps) {
  const [showDetails, setShowDetails] = useState(true);

  // Use the new search hook
  const { results: users, isLoading } = useEntitySearch<UserWithMembership | MembershipWithUser>({
    searchFunction: async (instance, onPage) => {
      if (entityType === "group") {
        // Handle group memberships (existing logic)
        const membershipData: MembershipWithUser[] = [];
        await searchZendeskGroupMemberships(entityId, instance, (page) => {
          membershipData.push(...page.map((membership) => ({ ...membership, user: undefined })));
        });

        // Then, fetch user data for all memberships
        try {
          const users = await getGroupUsers(entityId, instance);

          // Merge user data with memberships
          const enrichedMemberships = membershipData.map((membership) => {
            const user = users.find((u) => u.id === membership.user_id);
            return { ...membership, user };
          });

          onPage(enrichedMemberships);
        } catch {
          // If user data fetch fails, still show memberships with just IDs
          onPage(membershipData);
        }
      } else if (entityType === "role") {
        // Handle role memberships - search for users with this role
        try {
          const users = await searchZendeskUsers(`role:${entityId}`, instance);
          const usersWithMembership = users.map((user) => ({ ...user, membership: undefined }));
          onPage(usersWithMembership);
        } catch {
          onPage([]);
        }
      }
    },
    instance,
    dependencies: [entityId, entityType],
  });

  const getItemTitle = (item: UserWithMembership | MembershipWithUser) => {
    if (entityType === "group") {
      const membership = item as MembershipWithUser;
      return membership.user ? membership.user.name : `User ID: ${membership.user_id}`;
    } else {
      const user = item as UserWithMembership;
      return user.name;
    }
  };

  const getItemSubtitle = (item: UserWithMembership | MembershipWithUser) => {
    if (entityType === "group") {
      const membership = item as MembershipWithUser;
      return !showDetails ? membership.user?.email : undefined;
    } else {
      const user = item as UserWithMembership;
      return !showDetails ? user.email : undefined;
    }
  };

  const getItemIcon = (item: UserWithMembership | MembershipWithUser) => {
    if (entityType === "group") {
      const membership = item as MembershipWithUser;
      return membership.user?.photo?.content_url
        ? { source: membership.user.photo.content_url, mask: Image.Mask.Circle }
        : { source: "placeholder-user.svg", mask: Image.Mask.Circle };
    } else {
      const user = item as UserWithMembership;
      return user.photo?.content_url
        ? { source: user.photo.content_url, mask: Image.Mask.Circle }
        : { source: "placeholder-user.svg", mask: Image.Mask.Circle };
    }
  };

  const getItemAccessories = (item: UserWithMembership | MembershipWithUser) => {
    const accessories: List.Item.Accessory[] = [];

    if (entityType === "group") {
      const membership = item as MembershipWithUser;
      if (membership.user?.role && (membership.user.role === "agent" || membership.user.role === "admin")) {
        accessories.push({
          icon: {
            source: Icon.Person,
            tintColor: getUserRoleColor(membership.user.role),
          },
          tooltip: membership.user.role,
        });
      }
      if (membership.default) {
        accessories.push({
          icon: {
            source: Icon.Star,
            tintColor: Color.Yellow,
          },
          tooltip: "Default Group",
        });
      }
    } else {
      const user = item as UserWithMembership;
      if (user.role && (user.role === "agent" || user.role === "admin")) {
        accessories.push({
          icon: {
            source: Icon.Person,
            tintColor: getUserRoleColor(user.role),
          },
          tooltip: user.role,
        });
      }
    }

    return accessories;
  };

  const getItemDetail = (item: UserWithMembership | MembershipWithUser) => {
    if (entityType === "group") {
      const membership = item as MembershipWithUser;
      return (
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Membership ID" text={membership.id.toString()} />
              <List.Item.Detail.Metadata.Label title="User ID" text={membership.user_id.toString()} />
              <List.Item.Detail.Metadata.Label title="Group ID" text={membership.group_id.toString()} />
              {membership.user && (
                <>
                  <List.Item.Detail.Metadata.Label title="User Name" text={membership.user.name} />
                  {membership.user.email && (
                    <List.Item.Detail.Metadata.Link
                      title="Email"
                      text={membership.user.email}
                      target={`mailto:${membership.user.email}`}
                    />
                  )}
                  {membership.user.role && (
                    <List.Item.Detail.Metadata.TagList title="Role">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={membership.user.role}
                        color={getUserRoleColor(membership.user.role)}
                      />
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  {membership.user.phone && (
                    <List.Item.Detail.Metadata.Label title="Phone" text={membership.user.phone} />
                  )}
                </>
              )}
              <List.Item.Detail.Metadata.TagList title="Default Membership">
                <List.Item.Detail.Metadata.TagList.Item
                  text={membership.default ? "Default" : "Not Default"}
                  color={getDefaultStatusColor(membership.default)}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <TimestampMetadata created_at={membership.created_at} updated_at={membership.updated_at} />
            </List.Item.Detail.Metadata>
          }
        />
      );
    } else {
      const user = item as UserWithMembership;
      return (
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="User ID" text={user.id.toString()} />
              <List.Item.Detail.Metadata.Label title="User Name" text={user.name} />
              {user.email && (
                <List.Item.Detail.Metadata.Link title="Email" text={user.email} target={`mailto:${user.email}`} />
              )}
              {user.role && (
                <List.Item.Detail.Metadata.TagList title="Role">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={user.role || ""}
                    color={getUserRoleColor(user.role || "")}
                  />
                </List.Item.Detail.Metadata.TagList>
              )}
              {user.phone && <List.Item.Detail.Metadata.Label title="Phone" text={user.phone} />}
              <List.Item.Detail.Metadata.Separator />
              {user.created_at && user.updated_at && (
                <TimestampMetadata created_at={user.created_at} updated_at={user.updated_at} />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      );
    }
  };

  const getSearchPlaceholder = () => {
    if (entityType === "group") {
      return "Search group memberships...";
    } else {
      return "Search role members...";
    }
  };

  const getEmptyViewTitle = () => {
    if (entityType === "group") {
      return "No Group Memberships Found";
    } else {
      return "No Role Members Found";
    }
  };

  const getEmptyViewDescription = () => {
    if (entityType === "group") {
      return `No users are members of the group "${entityName}".`;
    } else {
      return `No users have the role "${entityName}".`;
    }
  };

  const getNavigationTitle = () => {
    if (entityType === "group") {
      return `Members of ${truncateText(entityName, TRUNCATION_CONSTANTS.SHORT_LENGTH)}`;
    } else {
      return `Users with Role: ${truncateText(entityName, TRUNCATION_CONSTANTS.SHORT_LENGTH)}`;
    }
  };

  return (
    <List
      isShowingDetail={showDetails}
      isLoading={isLoading}
      searchBarPlaceholder={getSearchPlaceholder()}
      throttle
      navigationTitle={getNavigationTitle()}
    >
      {users.length === 0 && !isLoading && (
        <List.EmptyView title={getEmptyViewTitle()} description={getEmptyViewDescription()} />
      )}
      {users.map((item, index) => {
        const key =
          entityType === "group"
            ? (item as MembershipWithUser).id?.toString() || `membership-${index}`
            : (item as UserWithMembership).id?.toString() || `user-${index}`;

        return (
          <List.Item
            key={key}
            title={getItemTitle(item)}
            subtitle={getItemSubtitle(item)}
            icon={getItemIcon(item)}
            accessories={getItemAccessories(item)}
            detail={getItemDetail(item)}
            actions={
              <ZendeskActions
                item={item}
                searchType={entityType === "group" ? "group_memberships" : "users"}
                instance={instance}
                onInstanceChange={() => {}}
                showDetails={showDetails}
                onShowDetailsChange={setShowDetails}
              />
            }
          />
        );
      })}
    </List>
  );
}
