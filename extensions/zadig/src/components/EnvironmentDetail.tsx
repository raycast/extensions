import { List } from "@raycast/api";
import { getAvatarIcon, useCachedPromise } from "@raycast/utils";
import { getEnvironmentServices, type Environment } from "../api/environments";
import { formatTime } from "../utils/time";
import { toMarkdownTable } from "../utils/markdown";
import { getStatusColor } from "../utils/status";

type EnvironmentDetailProps = {
  projectKey: string;
  environment: Environment;
};

const getImageTag = (image: string) => image.split("/").at(-1)?.split(":").at(1);

export default function EnvironmentDetail({ projectKey, environment }: EnvironmentDetailProps) {
  const { data: services, isLoading } = useCachedPromise(getEnvironmentServices, [
    projectKey,
    environment.env_key,
    environment.production,
  ]);

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={
        services && services.length > 0
          ? toMarkdownTable(
              ["Service", "Image tag"],
              services.map(service => [service.serviceName, getImageTag(service.images.at(0) ?? "") ?? "-"]),
            )
          : undefined
      }
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={environment.status}
              color={getStatusColor(environment.status)}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title="Updated By"
            icon={getAvatarIcon(environment.update_by)}
            text={environment.update_by}
          />
          <List.Item.Detail.Metadata.Label title="Updated" text={formatTime(environment.update_time)} />
          <List.Item.Detail.Metadata.Label title="Namespace" text={environment.namespace} />
          {services && <List.Item.Detail.Metadata.Label title="Services" text={String(services.length)} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
