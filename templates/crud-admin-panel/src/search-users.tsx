import { List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import UserActions from "./actions";
import { useUsers } from "./api";

export default function Command() {
  const { data, isLoading, revalidate } = useUsers();

  return (
    <List isLoading={isLoading}>
      {data?.map((user) => (
        <List.Item
          key={user._id}
          icon={getAvatarIcon(`${user.firstName} ${user.lastName}`)}
          title={`${user.firstName} ${user.lastName}`}
          subtitle={user.email}
          accessories={[
            {
              date: new Date(user.lastUpdatedAt),
              tooltip: `Last updated: ${new Date(user.lastUpdatedAt).toLocaleString()}`,
            },
          ]}
          actions={<UserActions user={user} onUpdateUser={revalidate} onDeleteUser={revalidate} showDetail />}
        />
      ))}
    </List>
  );
}
