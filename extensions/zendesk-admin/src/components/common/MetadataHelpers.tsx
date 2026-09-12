import { List } from "@raycast/api";
import { formatDateCompact, formatInstanceColor } from "../../utils/formatters";
import { ZendeskInstance } from "../../utils/preferences";

interface TimestampMetadataProps {
  created_at: string;
  updated_at: string;
}

interface InstanceMetadataProps {
  instance?: ZendeskInstance;
}

export const TimestampMetadata = ({ created_at, updated_at }: TimestampMetadataProps) => (
  <>
    <List.Item.Detail.Metadata.Label title="Created At" text={formatDateCompact(created_at)} />
    <List.Item.Detail.Metadata.Label title="Updated At" text={formatDateCompact(updated_at)} />
  </>
);

export const InstanceMetadata = ({ instance }: InstanceMetadataProps) => {
  if (!instance) return null;

  return (
    <>
      <List.Item.Detail.Metadata.TagList title="Instance">
        <List.Item.Detail.Metadata.TagList.Item text={instance.subdomain} color={formatInstanceColor(instance.color)} />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Separator />
    </>
  );
};
