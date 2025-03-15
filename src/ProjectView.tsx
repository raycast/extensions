import { ActionPanel, Action, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import StorageBucketView from "./StorageBucketView";
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
      // For MVP, we're focusing only on Cloud Storage
      const services = [
        { 
          id: "storage", 
          name: "Cloud Storage", 
          description: "Object storage for companies of all sizes"
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

  if (error) {
    return <List isLoading={false}><List.EmptyView title={error} /></List>;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search services...">
      <List.Section title={`Project: ${projectId}`}>
        {services.map((service: Service) => (
          <List.Item
            key={service.id}
            title={service.name}
            subtitle={service.description}
            actions={
              <ActionPanel>
                <Action 
                  title="View Storage Buckets" 
                  onAction={viewStorageBuckets} 
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
} 