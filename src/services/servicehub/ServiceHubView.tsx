import { useState, useEffect, useMemo, useCallback } from "react";
import { List, ActionPanel, Action, Icon, Toast, showToast, Color, useNavigation, Keyboard } from "@raycast/api";
import { ServiceHubService, GCPService } from "./ServiceHubService";
import ServiceDetails from "./components/ServiceDetails";

interface ViewProps {
  projectId: string;
  gcloudPath: string;
}

export default function ServiceHubView({ projectId, gcloudPath }: ViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState<GCPService[]>([]);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { push } = useNavigation();
  
  // Service initialization
  const serviceHub = useMemo(() => new ServiceHubService(gcloudPath, projectId), [gcloudPath, projectId]);
  
  // Fetch services on component mount
  useEffect(() => {
    fetchServices();
  }, []);
  
  // Prefetch service details for visible services
  const prefetchServiceDetails = useCallback(async (servicesToPrefetch: GCPService[]) => {
    // Limit to first 5 services to avoid too many requests
    const servicesToFetch = servicesToPrefetch.slice(0, 5);
    if (servicesToFetch.length > 0) {
      try {
        await serviceHub.prefetchServiceDetails(servicesToFetch.map(s => s.name));
      } catch (error) {
        console.warn("Error prefetching service details:", error);
      }
    }
  }, [serviceHub]);
  
  // Fetch services from GCP
  async function fetchServices() {
    try {
      if (!isRefreshing) {
        setIsLoading(true);
      }
      setIsRefreshing(true);
      setError(null);
      
      showToast({
        style: Toast.Style.Animated,
        title: "Loading services...",
        message: `Project: ${projectId}`,
      });
      
      const servicesList = await serviceHub.listServices({ includeDisabled: true });
      setServices(servicesList);
      
      showToast({
        style: Toast.Style.Success,
        title: `Loaded ${servicesList.length} services`,
      });
      
      // Prefetch details for the first few services
      prefetchServiceDetails(servicesList);
    } catch (error) {
      console.error("Error fetching services:", error);
      setError(`Failed to fetch services: ${error instanceof Error ? error.message : String(error)}`);
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch services",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }
  
  // Enable a service
  async function enableService(service: GCPService) {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: `Enabling ${service.displayName || service.name}...`,
      });
      
      await serviceHub.enableService(service.name);
      
      showToast({
        style: Toast.Style.Success,
        title: `Enabled ${service.displayName || service.name}`,
      });
      
      // Refresh the services list
      fetchServices();
    } catch (error) {
      console.error(`Error enabling service ${service.name}:`, error);
      
      showToast({
        style: Toast.Style.Failure,
        title: `Failed to enable ${service.displayName || service.name}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  // Disable a service
  async function disableService(service: GCPService) {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: `Disabling ${service.displayName || service.name}...`,
      });
      
      await serviceHub.disableService(service.name);
      
      showToast({
        style: Toast.Style.Success,
        title: `Disabled ${service.displayName || service.name}`,
      });
      
      // Refresh the services list
      fetchServices();
    } catch (error) {
      console.error(`Error disabling service ${service.name}:`, error);
      
      showToast({
        style: Toast.Style.Failure,
        title: `Failed to disable ${service.displayName || service.name}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  // Filter services based on status and search text
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      // Apply status filter
      if (statusFilter === "enabled" && !service.isEnabled) return false;
      if (statusFilter === "disabled" && service.isEnabled) return false;
      
      // Apply search filter
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        return (
          service.name.toLowerCase().includes(searchLower) ||
          (service.displayName && service.displayName.toLowerCase().includes(searchLower)) ||
          (service.description && service.description.toLowerCase().includes(searchLower)) ||
          (service.category && service.category.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    });
  }, [services, searchText, statusFilter]);
  
  // Group services by category
  const servicesByCategory = useMemo(() => {
    const grouped: Record<string, GCPService[]> = {};
    
    // Group by category
    filteredServices.forEach(service => {
      const category = service.category || "Other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(service);
    });
    
    // Sort categories alphabetically
    return Object.keys(grouped)
      .sort((a, b) => {
        // Put "Other" category at the end
        if (a === "Other") return 1;
        if (b === "Other") return -1;
        return a.localeCompare(b);
      })
      .reduce((acc, key) => {
        // Sort services within each category by name
        acc[key] = grouped[key].sort((a, b) => 
          (a.displayName || a.name).localeCompare(b.displayName || b.name)
        );
        return acc;
      }, {} as Record<string, GCPService[]>);
  }, [filteredServices]);
  
  // Get status icon based on service state
  function getStatusIcon(isEnabled: boolean): { source: Icon; tintColor: Color } {
    return isEnabled
      ? { source: Icon.Circle, tintColor: Color.Green }
      : { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
  
  // View service details
  function viewServiceDetails(service: GCPService) {
    push(
      <ServiceDetails
        service={service}
        serviceHub={serviceHub}
        onServiceStatusChange={fetchServices}
      />
    );
  }
  
  // Render error state
  if (error) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to load services"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={fetchServices} icon={Icon.RotateClockwise} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  
  // Calculate total services and enabled services
  const totalServices = services.length;
  const enabledServices = services.filter(s => s.isEnabled).length;
  const filteredCount = filteredServices.length;
  
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search services by name, category, or description..."
      onSearchTextChange={setSearchText}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Status"
          storeValue={true}
          onChange={setStatusFilter}
          value={statusFilter}
        >
          <List.Dropdown.Item title="All Services" value="all" />
          <List.Dropdown.Item title="Enabled Services" value="enabled" />
          <List.Dropdown.Item title="Disabled Services" value="disabled" />
        </List.Dropdown>
      }
      throttle
    >
      <List.Section title="Services" subtitle={`${filteredCount}/${totalServices} services (${enabledServices} enabled)`}>
        {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
          <List.Section key={category} title={category} subtitle={`${categoryServices.length} services`}>
            {categoryServices.map(service => (
              <List.Item
                key={service.name}
                title={service.displayName || service.name}
                subtitle={service.description || ""}
                accessories={[
                  { text: service.isEnabled ? "Enabled" : "Disabled" },
                  { icon: getStatusIcon(service.isEnabled) }
                ]}
                detail={
                  <List.Item.Detail
                    markdown={`
# ${service.displayName || service.name}

**Status:** ${service.isEnabled ? "✅ Enabled" : "❌ Disabled"}
**Category:** ${service.category || "Other"}

${service.description || "No description available."}

## Service Information

- **Service Name:** \`${service.name}\`
- **State:** ${service.state || "Unknown"}
                    `}
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.Push
                        title="View Service Details"
                        icon={Icon.Sidebar}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                        target={
                          <ServiceDetails
                            service={service}
                            serviceHub={serviceHub}
                            onServiceStatusChange={fetchServices}
                          />
                        }
                      />
                      {service.isEnabled ? (
                        <Action
                          title="Disable Service"
                          icon={Icon.XmarkCircle}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                          onAction={() => disableService(service)}
                        />
                      ) : (
                        <Action
                          title="Enable Service"
                          icon={Icon.CheckCircle}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                          onAction={() => enableService(service)}
                        />
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Refresh Services"
                        icon={Icon.RotateClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={fetchServices}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
      </List.Section>
      
      {/* Show empty view when no services match the search */}
      {services.length > 0 && Object.keys(servicesByCategory).length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matching services found"
          description="Try a different search term or filter"
        />
      )}
      
      {/* Show empty view when no services are available */}
      {services.length === 0 && !isLoading && !isRefreshing && (
        <List.EmptyView
          icon={Icon.QuestionMark}
          title="No services available"
          description="No Google Cloud services found for this project"
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={fetchServices} icon={Icon.RotateClockwise} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
} 