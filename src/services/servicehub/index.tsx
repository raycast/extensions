import { ActionPanel, Action, List, Icon, useNavigation, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { executeGcloudCommand } from "../../gcloud";

interface ServiceHubViewProps {
  projectId: string;
  gcloudPath: string;
}

export function ServiceHubView({ projectId, gcloudPath }: ServiceHubViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { pop } = useNavigation();

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    setIsLoading(true);
    try {
      // This is a placeholder - in a real implementation, you would fetch actual services
      // from Google Cloud using the gcloud command
      const mockServices = [
        { 
          id: "service1", 
          name: "API Gateway", 
          status: "Running",
          region: "us-central1"
        },
        { 
          id: "service2", 
          name: "Cloud Functions", 
          status: "Running",
          region: "us-east1"
        },
        { 
          id: "service3", 
          name: "Cloud Run", 
          status: "Running",
          region: "us-west1"
        },
        { 
          id: "service4", 
          name: "App Engine", 
          status: "Not configured",
          region: "global"
        }
      ];
      
      setServices(mockServices);
    } catch (error: any) {
      console.error("Error fetching services:", error);
      setError(`Failed to fetch services: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  if (error) {
    return <List isLoading={false}><List.EmptyView title={error} /></List>;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search services..."
      navigationTitle={`ServiceHub: ${projectId}`}
    >
      <List.Section title="Available Services">
        {services.map((service) => (
          <List.Item
            key={service.id}
            id={service.id}
            title={service.name}
            subtitle={`Region: ${service.region}`}
            icon={Icon.Globe}
            accessories={[
              {
                tag: {
                  value: service.status,
                  color: service.status === "Running" ? Color.Green : Color.SecondaryText,
                }
              }
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="View Service Details"
                  icon={Icon.Eye}
                  onAction={() => {
                    // Placeholder for viewing service details
                    // In a real implementation, you would navigate to a service detail view
                  }}
                />
                <Action
                  title="Go Back"
                  icon={Icon.ArrowLeft}
                  onAction={pop}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default ServiceHubView; 