import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { formatDistanceToNow } from "date-fns";
import { DeploymentInfo } from "../type";

interface ProjectDeploymentsItemProps {
  projectID: string;
  serviceID: string;
  environmentID: string;
  deployment: DeploymentInfo;
  isReloading: boolean;
  setIsReloading: (isReloading: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export default function ProjectDeploymentsItem({
  projectID,
  serviceID,
  environmentID,
  deployment,
  isReloading,
  setIsReloading,
  setIsLoading,
}: ProjectDeploymentsItemProps) {
  return (
    <List.Item
      key={deployment.node._id}
      title={deployment.node.status}
      accessories={[
        {
          tag: {
            value: formatDistanceToNow(new Date(deployment.node.createdAt), { addSuffix: true }),
          },
          tooltip: "Created At",
        },
        {
          tag: {
            value:
              deployment.node.commitMessage.slice(0, 50) + (deployment.node.commitMessage.length > 50 ? "..." : ""),
          },
          tooltip: "Commit Message",
        },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Deployment Page"
            url={`https://zeabur.com/projects/${projectID}/services/${serviceID}/deployments/${deployment.node._id}?envID=${environmentID}`}
          />
          <Action
            title="Reload Deployments Data"
            icon={Icon.ArrowClockwise}
            shortcut={{
              modifiers: ["cmd"],
              key: "r",
            }}
            onAction={async () => {
              setIsReloading(!isReloading);
              setIsLoading(true);
            }}
          />
        </ActionPanel>
      }
    />
  );
}
