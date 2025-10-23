import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getValidToken, isAuthenticated } from "./oauth/zoho-provider";
import { getServices, Service } from "./api/zoho-bookings";

export default function ListServicesCommand() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notAuthenticated, setNotAuthenticated] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    try {
      setIsLoading(true);

      const authenticated = await isAuthenticated();
      if (!authenticated) {
        setNotAuthenticated(true);
        await showToast({
          style: Toast.Style.Failure,
          title: "Not Authenticated",
          message: "Please run the Setup Zoho Auth command first",
        });
        setIsLoading(false);
        return;
      }

      const token = await getValidToken();
      const data = await getServices(token);
      setServices(data);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load services",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search services...">
      {notAuthenticated ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Not Authenticated"
          description="Please run the Setup Zoho Auth command to authenticate"
        />
      ) : services.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Star} title="No Services Found" description="No booking services are available" />
      ) : (
        services.map((service) => (
          <List.Item
            key={service.id}
            icon={Icon.Star}
            title={service.name}
            subtitle={service.duration}
            accessories={[{ text: `${service.currency} ${service.price || 0}` }]}
            actions={
              <ActionPanel>
                <Action.Push title="View Details" icon={Icon.Eye} target={<ServiceDetail service={service} />} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={loadServices}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function ServiceDetail({ service }: { service: Service }) {
  return (
    <List>
      <List.Item title="Service Name" subtitle={service.name} />
      <List.Item title="Duration" subtitle={service.duration} />
      <List.Item title="Price" subtitle={`${service.currency} ${service.price || 0}`} />
      <List.Item title="Service Type" subtitle={service.service_type} />
      <List.Item title="Buffer Time" subtitle={service.buffertime} />
      <List.Item
        title="Staff Selection"
        subtitle={service.let_customer_select_staff ? "Customer can select" : "Pre-assigned"}
      />
      {service.description && <List.Item title="Description" subtitle={service.description} />}
    </List>
  );
}
