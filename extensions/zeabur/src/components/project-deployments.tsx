import { useState, useEffect } from "react";
import { List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getLast5Deployments, getLatestRunningDeployment } from "../utils/zeabur-graphql";
import { DeploymentInfo } from "../type";
import ProjectDeploymentsItem from "./project-deployments-item";

interface ProjectDeploymentsProps {
  projectID: string;
  serviceID: string;
  environmentID: string;
}

export default function ProjectDeployments({ projectID, serviceID, environmentID }: ProjectDeploymentsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [historyDeployments, setHistoryDeployments] = useState<DeploymentInfo[]>([]);
  const [runningDeployment, setRunningDeployment] = useState<DeploymentInfo | null>(null);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    const fetchDeployments = async () => {
      try {
        const last5Deployments = await getLast5Deployments(serviceID, environmentID);
        const latestRunningDeployment = await getLatestRunningDeployment(serviceID, environmentID);
        setHistoryDeployments(last5Deployments);
        setRunningDeployment(latestRunningDeployment);
        setIsLoading(false);
      } catch {
        showFailureToast("Failed to fetch deployments");
        setIsLoading(false);
      }
    };
    fetchDeployments();
  }, [projectID, serviceID, environmentID, isReloading]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search deployments">
      <List.Section title="Latest Running Deployment">
        {runningDeployment && (
          <ProjectDeploymentsItem
            key={runningDeployment.node._id}
            projectID={projectID}
            serviceID={serviceID}
            environmentID={environmentID}
            deployment={runningDeployment}
            isReloading={isReloading}
            setIsReloading={setIsReloading}
            setIsLoading={setIsLoading}
          />
        )}
      </List.Section>
      {historyDeployments.length > 0 ? (
        <List.Section title="History">
          {historyDeployments.map((deployment) => (
            <ProjectDeploymentsItem
              key={deployment.node._id}
              projectID={projectID}
              serviceID={serviceID}
              environmentID={environmentID}
              deployment={deployment}
              isReloading={isReloading}
              setIsReloading={setIsReloading}
              setIsLoading={setIsLoading}
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView title="No deployments found" />
      )}
    </List>
  );
}
