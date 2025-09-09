import { List, Color, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getDefaultStatusColor, getBooleanIcon } from "../../utils/colors";
import { TimestampMetadata } from "../common/MetadataHelpers";
import { useState, useEffect } from "react";
import { ZendeskInstance } from "../../utils/preferences";
import {
  searchZendeskUserGroupMemberships,
  ZendeskGroupMembership,
  getUserGroups,
  ZendeskGroup,
} from "../../api/zendesk";
import { ZendeskActions } from "../actions/ZendeskActions";

interface UserGroupMembershipsListProps {
  userId: number;
  userName: string;
  instance: ZendeskInstance | undefined;
}

interface MembershipWithGroup extends ZendeskGroupMembership {
  group?: ZendeskGroup;
}

export default function UserGroupMembershipsList({ userId, userName, instance }: UserGroupMembershipsListProps) {
  const [memberships, setMemberships] = useState<MembershipWithGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    if (instance) {
      performSearch();
    } else {
      setIsLoading(false);
    }
  }, [instance, userId]);

  async function performSearch() {
    if (!instance) {
      showFailureToast(new Error("No Zendesk instances configured."), { title: "Configuration Error" });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // First, get the user group memberships
      const membershipData: MembershipWithGroup[] = [];
      await searchZendeskUserGroupMemberships(userId, instance, (page) => {
        membershipData.push(...page.map((membership) => ({ ...membership, group: undefined })));
      });

      // Then, fetch group data for all memberships
      try {
        const groups = await getUserGroups(userId, instance);

        // Merge group data with memberships
        const enrichedMemberships = membershipData.map((membership) => {
          const group = groups.find((g) => g.id === membership.group_id);
          return { ...membership, group };
        });

        setMemberships(enrichedMemberships);
      } catch (_groupError) {
        // If group data fetch fails, still show memberships with just IDs
        setMemberships(membershipData);
      }
    } catch (error: unknown) {
      showFailureToast(error, { title: "Search Failed" });
      setMemberships([]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List
      isShowingDetail={showDetails}
      isLoading={isLoading}
      searchBarPlaceholder="Search user group memberships..."
      throttle
    >
      {memberships.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Group Memberships Found"
          description={`User "${userName}" is not a member of any groups.`}
        />
      )}
      {memberships.map((membership) => {
        const nameParts = (membership.group?.name ?? "").split(".");
        const title =
          nameParts.length > 1
            ? nameParts.slice(1).join(".")
            : membership.group?.name || `Group ID: ${membership.group_id}` || "Unknown Group";
        const accessory = nameParts.length > 1 ? nameParts[0] : "";

        return (
          <List.Item
            key={membership.id}
            title={title}
            subtitle={membership.group?.description}
            accessories={[
              ...(accessory ? [{ text: accessory }] : []),
              ...(membership.default
                ? [
                    {
                      icon: {
                        source: Icon.Star,
                        tintColor: Color.Yellow,
                      },
                      tooltip: "Default Group",
                    },
                  ]
                : []),
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Membership ID" text={membership.id.toString()} />
                    <List.Item.Detail.Metadata.Label title="User ID" text={membership.user_id.toString()} />
                    <List.Item.Detail.Metadata.Label title="Group ID" text={membership.group_id.toString()} />
                    {membership.group && (
                      <>
                        <List.Item.Detail.Metadata.Label title="Group Name" text={membership.group.name} />
                        {membership.group.description && (
                          <List.Item.Detail.Metadata.Label title="Description" text={membership.group.description} />
                        )}
                        <List.Item.Detail.Metadata.Label
                          title="Default"
                          icon={getBooleanIcon(membership.group.default)}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Deleted"
                          icon={getBooleanIcon(membership.group.deleted)}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Is Public"
                          icon={getBooleanIcon(membership.group.is_public)}
                        />
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
            }
            actions={
              <ZendeskActions
                item={membership}
                searchType="group_memberships"
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
