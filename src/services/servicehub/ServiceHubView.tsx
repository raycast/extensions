import { useState, useEffect, useMemo } from "react";
import { List, ActionPanel, Action, Icon, Toast, showToast, Color, useNavigation } from "@raycast/api";
import { ServiceHubService, GCPService } from "./ServiceHubService";
import ServiceDetails from "./components/ServiceDetails";
import { GCPServiceCategory } from "../../utils/gcpServices";

interface ViewProps {
  projectId: string;
  gcloudPath: string;
}

export default function ServiceHubView({ projectId, gcloudPath }: ViewProps) {
  const [services, setServices] = useState<GCPService[]>([]);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);
  const { push } = useNavigation();
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);
  const [showCoreServicesOnly, setShowCoreServicesOnly] = useState(true);
  const [selectedService, setSelectedService] = useState<GCPService | null>(null);
  
  // Service initialization
  const serviceHub = useMemo(() => new ServiceHubService(gcloudPath, projectId), [gcloudPath, projectId]);
  
  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);
  
  // Fetch services when category or filter changes
  useEffect(() => {
    // First load with local data for instant UI
    fetchLocalServices();
    // Then fetch from API
    fetchServices();
  }, [selectedCategory, showCoreServicesOnly]);
  
  // Fetch categories
  async function fetchCategories() {
    try {
      const allCategories = await serviceHub.getAllCategories();
      setCategories(["all", ...allCategories]);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }
  
  // Fetch local services first for instant UI
  async function fetchLocalServices() {
    try {
      setIsLoading(true);
      const options = {
        useLocalOnly: true,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        coreServicesOnly: true
      };
      const servicesList = await serviceHub.listServices(options);
      setServices(servicesList);
    } catch (error) {
      console.error("Error fetching local services:", error);
    } finally {
      setIsLoading(false);
    }
  }
  
  // Fetch services from GCP
  async function fetchServices() {
    try {
      setIsRefreshing(true);
      setError(null);
      
      showToast({
        style: Toast.Style.Animated,
        title: "Loading services...",
        message: `Category: ${selectedCategory !== "all" ? selectedCategory : "All"}`,
      });
      
      // Use category filter if selected
      const options = { 
        includeDisabled: true,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        coreServicesOnly: showCoreServicesOnly
      };
      
      const servicesList = await serviceHub.listServices(options);
      setServices(servicesList);
      
      showToast({
        style: Toast.Style.Success,
        title: `Loaded ${servicesList.length} services`,
        message: selectedCategory !== "all" ? `Category: ${selectedCategory}` : undefined
      });
    } catch (error) {
      console.error("Error fetching services:", error);
      setError(`Failed to fetch services: ${error instanceof Error ? error.message : String(error)}`);
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch services",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsRefreshing(false);
    }
  }
  
  // Refresh services with current filters
  function refreshServices() {
    fetchServices();
  }
  
  // Enable a service
  async function enableService(service: GCPService) {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: `Enabling ${service.displayName || service.name}...`,
      });
      
      await serviceHub.enableService(service.name);
      
      // Check if the service is now enabled
      const isEnabled = await serviceHub.isServiceEnabled(service.name);
      
      if (isEnabled) {
        showToast({
          style: Toast.Style.Success,
          title: `Enabled ${service.displayName || service.name}`,
        });
        
        // Update the service in the current list
        setServices(prevServices => 
          prevServices.map(s => 
            s.name === service.name 
              ? { ...s, isEnabled: true, state: "ENABLED" } 
              : s
          )
        );
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: `Failed to enable ${service.displayName || service.name}`,
          message: "Service did not enable properly. Try again or check GCP Console."
        });
      }
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
      
      // Check if the service is now disabled
      const isEnabled = await serviceHub.isServiceEnabled(service.name);
      
      if (!isEnabled) {
        showToast({
          style: Toast.Style.Success,
          title: `Disabled ${service.displayName || service.name}`,
        });
        
        // Update the service in the current list
        setServices(prevServices => 
          prevServices.map(s => 
            s.name === service.name 
              ? { ...s, isEnabled: false, state: "DISABLED" } 
              : s
          )
        );
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: `Failed to disable ${service.displayName || service.name}`,
          message: "Service did not disable properly. Try again or check GCP Console."
        });
      }
    } catch (error) {
      console.error(`Error disabling service ${service.name}:`, error);
      
      showToast({
        style: Toast.Style.Failure,
        title: `Failed to disable ${service.displayName || service.name}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  // Filter services based on search text, category, and enabled status
  const filteredServices = useMemo(() => {
    let result = [...services];
    
    // Filter by search text
    if (searchText) {
      const lowerSearchText = searchText.toLowerCase();
      result = result.filter(
        service => 
          service.name.toLowerCase().includes(lowerSearchText) ||
          (service.displayName && service.displayName.toLowerCase().includes(lowerSearchText)) ||
          (service.description && service.description.toLowerCase().includes(lowerSearchText)) ||
          (service.category && service.category.toLowerCase().includes(lowerSearchText))
      );
    }
    
    // Filter by category if not "all"
    if (selectedCategory !== "all") {
      result = result.filter(service => service.category === selectedCategory);
    }
    
    // Filter by enabled status
    if (showOnlyEnabled) {
      result = result.filter(service => service.isEnabled);
    }
    
    return result;
  }, [services, searchText, selectedCategory, showOnlyEnabled]);
  
  // View service details - fetch fresh details for the selected service
  async function viewServiceDetails(service: GCPService) {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: `Loading details for ${service.displayName || service.name}...`,
      });
      
      // Fetch fresh details for this specific service
      const serviceDetails = await serviceHub.getServiceDetails(service.name);
      
      // Navigate to details view with fresh data
      push(
        <ServiceDetails
          service={serviceDetails}
          serviceHub={serviceHub}
          onServiceStatusChange={(updatedService) => {
            // Update the service in the current list
            if (updatedService) {
              setServices(prevServices => 
                prevServices.map(s => 
                  s.name === updatedService.name ? updatedService : s
                )
              );
            } else {
              // If no service provided, refresh all
              refreshServices();
            }
          }}
        />
      );
    } catch (error) {
      console.error(`Error fetching details for ${service.name}:`, error);
      
      showToast({
        style: Toast.Style.Failure,
        title: `Failed to load details`,
        message: error instanceof Error ? error.message : String(error),
      });
      
      // Navigate to details view with existing data as fallback
      push(
        <ServiceDetails
          service={service}
          serviceHub={serviceHub}
          onServiceStatusChange={(updatedService) => {
            if (updatedService) {
              setServices(prevServices => 
                prevServices.map(s => 
                  s.name === updatedService.name ? updatedService : s
                )
              );
            } else {
              refreshServices();
            }
          }}
        />
      );
    }
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
  
  // Get status icon for a service
  function getStatusIcon(service: GCPService) {
    if (service.isEnabled) {
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    }
    return undefined;
  }
  
  // Get icon for a service based on category
  function getServiceIcon(service: GCPService) {
    const category = service.category || GCPServiceCategory.OTHER;
    
    switch (category) {
      case GCPServiceCategory.COMPUTE:
        return Icon.Desktop;
      case GCPServiceCategory.STORAGE:
        return Icon.HardDrive;
      case GCPServiceCategory.DATABASE:
        return Icon.List;
      case GCPServiceCategory.NETWORKING:
        return Icon.Globe;
      case GCPServiceCategory.SECURITY:
        return Icon.Lock;
      case GCPServiceCategory.ANALYTICS:
        return Icon.BarChart;
      case GCPServiceCategory.AI_ML:
        return Icon.LightBulb;
      case GCPServiceCategory.DEVOPS:
        return Icon.Hammer;
      case GCPServiceCategory.MANAGEMENT:
        return Icon.Gear;
      case GCPServiceCategory.SERVERLESS:
        return Icon.Cloud;
      default:
        return Icon.Circle;
    }
  }
  
  // Get title for the current view
  const viewTitle = useMemo(() => {
    if (showOnlyEnabled) return "Enabled Services";
    if (selectedCategory !== "all") return selectedCategory;
    return showCoreServicesOnly ? "Core Services" : "All Services";
  }, [selectedCategory, showOnlyEnabled, showCoreServicesOnly]);
  
  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search services..."
      navigationTitle="Google Cloud Services"
      filtering={false}
      throttle={true}
      actions={
        <ActionPanel>
          <Action
            title="Refresh Services"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refreshServices}
          />
        </ActionPanel>
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter options"
          onChange={(value) => {
            if (value === "category:all") {
              setSelectedCategory("all");
            } else if (value.startsWith("category:")) {
              setSelectedCategory(value.replace("category:", ""));
            } else if (value === "status:enabled") {
              setShowOnlyEnabled(true);
            } else if (value === "status:all") {
              setShowOnlyEnabled(false);
            } else if (value === "core:true") {
              setShowCoreServicesOnly(true);
            } else if (value === "core:false") {
              setShowCoreServicesOnly(false);
            }
          }}
        >
          <List.Dropdown.Section title="Categories">
            <List.Dropdown.Item title="All Categories" value="category:all" />
            {categories.map(category => (
              <List.Dropdown.Item key={category} title={category} value={`category:${category}`} />
            ))}
          </List.Dropdown.Section>
          
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title="All Services" value="status:all" />
            <List.Dropdown.Item title="Enabled Services" value="status:enabled" />
          </List.Dropdown.Section>
          
          <List.Dropdown.Section title="Service Type">
            <List.Dropdown.Item title="Core Services Only" value="core:true" />
            <List.Dropdown.Item title="All Services" value="core:false" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title={viewTitle}>
        {filteredServices.map(service => (
          <List.Item
            key={service.name}
            title={service.displayName || service.name}
            subtitle={service.description ? service.description.split('.')[0] : ''}
            icon={{ 
              source: getServiceIcon(service), 
              tintColor: service.isEnabled ? Color.Blue : Color.SecondaryText 
            }}
            accessories={service.isEnabled ? [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green } }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="View Details"
                  icon={Icon.Sidebar}
                  onAction={() => viewServiceDetails(service)}
                />
                <Action
                  title={service.isEnabled ? "Disable Service" : "Enable Service"}
                  icon={service.isEnabled ? Icon.XmarkCircle : Icon.CheckCircle}
                  onAction={() => service.isEnabled ? disableService(service) : enableService(service)}
                />
                <Action
                  title="Refresh Services"
                  icon={Icon.RotateClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={refreshServices}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      
      {/* Show empty view when no services match the search */}
      {services.length > 0 && filteredServices.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matching services"
          description={`No services found matching "${searchText}". Try a different search term or filter.`}
          actions={
            <ActionPanel>
              <Action
                title="Clear Search"
                icon={Icon.Trash}
                onAction={() => setSearchText("")}
              />
              <Action
                title="Refresh Services"
                icon={Icon.RotateClockwise}
                onAction={refreshServices}
              />
            </ActionPanel>
          }
        />
      )}
      
      {/* Show empty view when no services are available */}
      {services.length === 0 && !isLoading && !isRefreshing && (
        <List.EmptyView
          icon={Icon.QuestionMark}
          title="No services available"
          description={selectedCategory !== "all" ? `No ${selectedCategory} services found` : "No Google Cloud services found for this project"}
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={refreshServices} icon={Icon.RotateClockwise} />
            </ActionPanel>
          }
        />
      )}
      
      {/* Show error state */}
      {error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Loading Services"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.RotateClockwise}
                onAction={refreshServices}
              />
            </ActionPanel>
          }
        />
      )}
      
      {/* Show loading state */}
      {isLoading && services.length === 0 && !error && (
        <List.EmptyView
          icon={Icon.CircleProgress}
          title="Loading Services"
          description="Fetching Google Cloud services..."
        />
      )}
    </List>
  );
} 