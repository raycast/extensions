import { ActionPanel, Action, List, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { StorageBucketView, IAMMembersByPrincipalView } from "./services/storage";
import { IAMView } from "./services/iam";
import { executeGcloudCommand } from "./gcloud";

const execPromise = promisify(exec);

interface ProjectViewProps {
  projectId: string;
  gcloudPath: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  icon: Icon;
}

export default function ProjectView({ projectId, gcloudPath }: ProjectViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [projectDetails, setProjectDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    fetchServices();
    fetchProjectDetails();
  }, []);

  async function fetchProjectDetails() {
    try {
      const result = await executeGcloudCommand(
        gcloudPath, 
        `projects describe ${projectId} --format=json`
      );
      if (result && result.length > 0) {
        setProjectDetails(result[0]);
      }
    } catch (error) {
      console.error("Error fetching project details:", error);
    }
  }

  async function fetchServices() {
    setIsLoading(true);
    try {
      // For MVP, we're focusing only on Cloud Storage and IAM
      const services = [
        { 
          id: "storage", 
          name: "Cloud Storage", 
          description: "Object storage for companies of all sizes",
          icon: Icon.Box
        },
        {
          id: "iam",
          name: "Identity and Access Management (IAM)",
          description: "Fine-grained access control and visibility for centrally managing cloud resources",
          icon: Icon.Key
        }
      ];
      
      setServices(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      setError("Failed to fetch services for this project");
    } finally {
      setIsLoading(false);
    }
  }

  async function viewStorageBuckets() {
    push(<StorageBucketView projectId={projectId} gcloudPath={gcloudPath} />);
  }

  async function viewIAMPermissions() {
    push(<IAMMembersByPrincipalView projectId={projectId} gcloudPath={gcloudPath} />);
  }

  async function viewIAMService() {
    push(<IAMView projectId={projectId} gcloudPath={gcloudPath} />);
  }

  if (error) {
    return <List isLoading={false}><List.EmptyView title={error} /></List>;
  }

  return (
    <List 
      isLoading={isLoading} 
      searchBarPlaceholder="Search services..."
      navigationTitle={`Project: ${projectId}`}
      isShowingDetail
    >
      <List.Section title={`Project Services`}>
        {services.map((service: Service) => (
          <List.Item
            key={service.id}
            title={service.name}
            subtitle=""
            icon={{ source: service.icon }}
            detail={
              <List.Item.Detail
                markdown={`# ${service.name}\n\n${service.description}\n\n## Project Information\n\n**ID:** ${projectId}\n${projectDetails ? `**Name:** ${projectDetails.name}\n**Number:** ${projectDetails.projectNumber}\n**Created:** ${new Date(projectDetails.createTime).toLocaleString()}` : ''}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Service" text={service.name} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Project ID" text={projectId} />
                    {projectDetails && (
                      <>
                        <List.Item.Detail.Metadata.Label title="Project Name" text={projectDetails.name} />
                        <List.Item.Detail.Metadata.Label title="Project Number" text={projectDetails.projectNumber} />
                        <List.Item.Detail.Metadata.Label title="Created" text={new Date(projectDetails.createTime).toLocaleString()} />
                      </>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {service.id === "storage" ? (
                  <Action 
                    title="View Storage Buckets" 
                    icon={Icon.Box}
                    onAction={viewStorageBuckets} 
                  />
                ) : service.id === "iam" ? (
                  <Action 
                    title="Manage IAM" 
                    icon={Icon.Key}
                    onAction={viewIAMService} 
                  />
                ) : null}
                {service.id === "storage" && (
                  <Action 
                    title="Manage IAM Permissions" 
                    icon={Icon.Key}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                    onAction={viewIAMPermissions} 
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
} 