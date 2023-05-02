import { Detail, useNavigation } from "@raycast/api";
import UserActions from "./actions";
import { User, useUser } from "./api";

export default function UserDetail(props: { user: User }) {
  const { pop } = useNavigation();
  const { data, isLoading, revalidate } = useUser(props.user);

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${data.firstName} ${data.lastName}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="ID" text={data._id} />
          <Detail.Metadata.Label title="Email" text={data.email} />
          <Detail.Metadata.Label title="Created" text={new Date(data.createdAt).toLocaleString()} />
          <Detail.Metadata.Label title="Last updated" text={new Date(data.lastUpdatedAt).toLocaleString()} />
        </Detail.Metadata>
      }
      actions={<UserActions user={data} onDeleteUser={pop} onUpdateUser={revalidate} />}
    />
  );
}
