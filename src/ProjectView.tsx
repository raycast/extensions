import { ActionPanel, Action, List, Icon, useNavigation, Cache, showToast } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { StorageBucketView, IAMMembersByPrincipalView } from "./services/storage";
import { IAMView } from "./services/iam";
import { ServiceHubView } from "./services/servicehub";
import { executeGcloudCommand } from "./gcloud";

// Create a cache instance
const cache = new Cache({ namespace: "project-details" });
// Cache expiration time in milliseconds (1 hour)
const CACHE_TTL = 3600000;

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

// Pre-define services to avoid recreating them on each render
const AVAILABLE_SERVICES: Service[] = [
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
  },
  {
    id: "servicehub",
    name: "ServiceHub",
    description: "Centralized service management and discovery platform",
    icon: Icon.Globe
  }
];

export default function ProjectView({ projectId, gcloudPath }: ProjectViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [projectDetails, setProjectDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();

  // Memoize the fetchProjectDetails function to avoid recreating it on each render
  const fetchProjectDetails = useCallback(async () => {
    // Check if we have cached project details
    const cachedDetails = cache.get(`project-${projectId}`);
    const cachedTimestamp = cache.get(`project-${projectId}-timestamp`);
    
    if (cachedDetails && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10);
      // Check if cache is still valid
      if (Date.now() - timestamp < CACHE_TTL) {
        try {
          setProjectDetails(JSON.parse(cachedDetails));
          return;
        } catch (e) {
          // If parsing fails, continue to fetch fresh data
          console.error("Failed to parse cached project details:", e);
        }
      }
    }

    setIsLoading(true);
    try {
      const result = await executeGcloudCommand(
        gcloudPath, 
        `projects describe ${projectId}`
      );
      if (result && result.length > 0) {
        setProjectDetails(result[0]);
        // Cache the result
        cache.set(`project-${projectId}`, JSON.stringify(result[0]));
        cache.set(`project-${projectId}-timestamp`, Date.now().toString());
      }
    } catch (error) {
      console.error("Error fetching project details:", error);
      setError("Failed to fetch project details");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, gcloudPath]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  const viewStorageBuckets = () => {
    push(<StorageBucketView projectId={projectId} gcloudPath={gcloudPath} />);
  };

  const viewIAMPermissions = () => {
    push(<IAMMembersByPrincipalView projectId={projectId} gcloudPath={gcloudPath} />);
  };

  const viewIAMService = () => {
    push(<IAMView projectId={projectId} gcloudPath={gcloudPath} />);
  };

  const viewServiceHub = () => {
    push(<ServiceHubView projectId={projectId} gcloudPath={gcloudPath} />);
  };

  const clearCache = useCallback(async () => {
    cache.remove(`project-${projectId}`);
    cache.remove(`project-${projectId}-timestamp`);
    await fetchProjectDetails();
  }, [projectId, fetchProjectDetails]);

  if (error) {
    return <List isLoading={false}><List.EmptyView title={error} /></List>;
  }

  return (
    <List 
      isLoading={isLoading} 
      searchBarPlaceholder="Search services..."
      navigationTitle={`Project: ${projectId}`}
    >
      <List.Section title="Project Services">
        {AVAILABLE_SERVICES.map((service) => (
          <List.Item
            id={service.id}
            key={service.id}
            title={service.name}
            subtitle={service.description}
            icon={service.icon}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {service.id === "storage" && (
                    <Action title="View Storage Buckets" icon={Icon.Box} onAction={viewStorageBuckets} />
                  )}
                  {service.id === "iam" && (
                    <>
                      <Action title="View IAM Permissions" icon={Icon.Key} onAction={viewIAMService} />
                      <Action title="View IAM by Principal" icon={Icon.Person} onAction={viewIAMPermissions} />
                    </>
                  )}
                  {service.id === "servicehub" && (
                    <Action title="View ServiceHub" icon={Icon.Globe} onAction={viewServiceHub} />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action title="Refresh Project Details" icon={Icon.RotateClockwise} onAction={fetchProjectDetails} />
                  <Action title="Clear Cache" icon={Icon.Trash} onAction={clearCache} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
} 