import { ActionPanel, Action, List, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { StorageBucketView, IAMMembersByPrincipalView } from "./services/storage";
import { IAMDashboardView } from "./services/iam";
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
}

export default function ProjectView({ projectId, gcloudPath }: ProjectViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    setIsLoading(true);
    try {
      // For MVP, we're focusing only on Cloud Storage and IAM
      const services = [
        { 
          id: "storage", 
          name: "Cloud Storage", 
          description: "Object storage for companies of all sizes"
        },
        {
          id: "iam",
          name: "Identity and Access Management (IAM)",
          description: "Fine-grained access control and visibility for centrally managing cloud resources"
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
    push(<IAMDashboardView projectId={projectId} gcloudPath={gcloudPath} />);
  }

  if (error) {
    return <List isLoading={false}><List.EmptyView title={error} /></List>;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search services...">
      <List.Section title={`Project: ${projectId}`}>
        {services.map((service: Service) => {
          if (service.id === "storage") {
            return (
              <List.Item
                key={service.id}
                title={service.name}
                subtitle={service.description}
                icon={{ source: Icon.Box }}
                actions={
                  <ActionPanel>
                    <Action 
                      title="View Storage Buckets" 
                      icon={Icon.Box}
                      onAction={viewStorageBuckets} 
                    />
                    <Action 
                      title="Manage IAM Permissions" 
                      icon={Icon.Key}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                      onAction={viewIAMPermissions} 
                    />
                  </ActionPanel>
                }
              />
            );
          } else if (service.id === "iam") {
            return (
              <List.Item
                key={service.id}
                title={service.name}
                subtitle={service.description}
                icon={{ source: Icon.Key }}
                actions={
                  <ActionPanel>
                    <Action 
                      title="Manage IAM" 
                      icon={Icon.Key}
                      onAction={viewIAMService} 
                    />
                  </ActionPanel>
                }
              />
            );
          }
          return null;
        })}
      </List.Section>
    </List>
  );
} 