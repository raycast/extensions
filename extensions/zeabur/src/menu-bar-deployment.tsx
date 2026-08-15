import { MenuBarExtra, Icon, getPreferenceValues, openExtensionPreferences, open, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { DeploymentWithContext } from "./type";
import { getProjects, getServicesBasic, getLast5Deployments } from "./utils/zeabur-graphql";

function getStatusIcon(status: string): { source: Icon; tintColor: Color } {
  switch (status) {
    case "RUNNING":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "PENDING":
    case "BUILDING":
    case "DEPLOYING":
      return { source: Icon.CircleProgress, tintColor: Color.Blue };
    case "FAILED":
    case "CRASHED":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "CANCELED":
    case "REMOVED":
      return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

async function fetchRecentDeployments(): Promise<DeploymentWithContext[]> {
  const projects = await getProjects();

  const allDeploymentsArrays = await Promise.all(
    projects
      .filter((project) => project.environments?.length > 0)
      .map(async (project) => {
        const environmentId = project.environments[0]._id;
        const services = await getServicesBasic(project._id, environmentId);

        const projectDeployments = await Promise.all(
          services.map((service) =>
            getLast5Deployments(service._id, environmentId).then((edges) =>
              edges.map((edge) => ({
                deployment: edge,
                projectId: project._id,
                projectName: project.name,
                serviceName: service.name,
              })),
            ),
          ),
        );

        return projectDeployments.flat();
      }),
  );

  return allDeploymentsArrays
    .flat()
    .sort((a, b) => new Date(b.deployment.node.createdAt).getTime() - new Date(a.deployment.node.createdAt).getTime())
    .slice(0, 10);
}

export default function Command() {
  const preferences = getPreferenceValues();
  const zeaburToken = preferences.zeaburToken;
  const hasToken = zeaburToken !== undefined && zeaburToken !== "";

  const { data: deployments, isLoading } = useCachedPromise(fetchRecentDeployments, [], {
    execute: hasToken,
    keepPreviousData: true,
  });

  return (
    <MenuBarExtra icon="extension-icon.png" tooltip="Recent Deployments">
      <MenuBarExtra.Section title="Recent Deployments">
        {!hasToken ? (
          <MenuBarExtra.Item
            title="Zeabur Token is not set. Click here to set it."
            onAction={openExtensionPreferences}
          />
        ) : isLoading && !deployments ? (
          <MenuBarExtra.Item title="Loading deployments..." icon={Icon.CircleProgress} />
        ) : !deployments || deployments.length === 0 ? (
          <MenuBarExtra.Item title="No deployments found" />
        ) : (
          deployments.map((item) => (
            <MenuBarExtra.Item
              key={item.deployment.node._id}
              title={`${item.serviceName}`}
              subtitle={`${item.projectName} · ${formatTimeAgo(item.deployment.node.createdAt)}`}
              tooltip={item.deployment.node.status}
              icon={getStatusIcon(item.deployment.node.status)}
              onAction={() =>
                open(
                  `https://zeabur.com/projects/${item.projectId}/services/${item.deployment.node.serviceID}/deployments/${item.deployment.node._id}?envID=${item.deployment.node.environmentID}`,
                )
              }
            />
          ))
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
