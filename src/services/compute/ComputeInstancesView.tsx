import { useEffect, useState, useCallback } from "react";
import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  Toast,
  showToast,
  confirmAlert,
  Alert,
  useNavigation,
} from "@raycast/api";
import { ComputeService, ComputeInstance } from "./ComputeService";
import ComputeInstanceDetailView from "./ComputeInstanceDetailView";

interface ComputeInstancesViewProps {
  projectId: string;
  gcloudPath: string;
}

export default function ComputeInstancesView({ projectId, gcloudPath }: ComputeInstancesViewProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [instances, setInstances] = useState<ComputeInstance[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | undefined>(undefined);
  const [zones, setZones] = useState<string[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [service, setService] = useState<ComputeService | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    // Initialize service with provided gcloudPath and projectId
    const computeService = new ComputeService(gcloudPath, projectId);
    setService(computeService);

    const initializeData = async () => {
      // Show initial loading toast
      const loadingToast = showToast({
        style: Toast.Style.Animated,
        title: "Loading Compute Engine instances...",
        message: "Please wait while we fetch your instances"
      });
      
      try {
        // Set loading state immediately to show user something is happening
        setIsLoading(true);
        
        console.log(`Initializing compute service for project: ${projectId}`);
        
        // Try to fetch instances with a timeout
        const fetchPromise = computeService.getInstances();
        
        // Set a timeout of 30 seconds to avoid UI hanging indefinitely
        const timeoutPromise = new Promise<ComputeInstance[]>((_, reject) => {
          setTimeout(() => reject(new Error("Fetch timeout - service may be unavailable")), 30000);
        });
        
        // Race the promises - use whichever completes first
        const fetchedInstances = await Promise.race<ComputeInstance[]>([fetchPromise, timeoutPromise]);
        
        console.log(`Fetched ${fetchedInstances.length} compute instances`);
        setInstances(fetchedInstances);
        
        // Then fetch zones in the background
        fetchZones(computeService);
        
        loadingToast.then(toast => toast.hide());
        
        if (fetchedInstances.length === 0) {
          // If no instances found, show a more informative message
          showToast({
            style: Toast.Style.Success,
            title: "No instances found",
            message: "This project has no Compute Engine instances"
          });
        } else {
          showToast({
            style: Toast.Style.Success,
            title: "Instances loaded",
            message: `${fetchedInstances.length} instances found`,
          });
        }
      } catch (error: any) {
        console.error("Error initializing:", error);
        loadingToast.then(toast => toast.hide());
        
        // Show more informative error message based on error type
        if (error.message.includes("timeout")) {
          showToast({
            style: Toast.Style.Failure,
            title: "Request Timed Out",
            message: "Try again or check your connection",
          });
        } else if (error.message.includes("Authentication")) {
          showToast({
            style: Toast.Style.Failure,
            title: "Authentication Error",
            message: "Please re-authenticate with Google Cloud",
          });
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to Load Instances",
            message: error.message,
          });
        }
        
        // Set instances to empty array to avoid UI hanging
        setInstances([]);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [gcloudPath, projectId]);
  
  const fetchZones = async (computeService: ComputeService) => {
    try {
      const zonesList = await computeService.listZones();
      setZones(zonesList);
    } catch (error: any) {
      console.error("Error fetching zones:", error);
      // Don't show error toast for zones, as it's not critical
    }
  };

  const fetchInstances = async (computeService: ComputeService) => {
    setIsLoading(true);
    
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading instances...",
      message: selectedZone ? `Zone: ${selectedZone}` : "All zones",
    });
    
    try {
      const fetchedInstances = await computeService.getInstances(selectedZone);
      setInstances(fetchedInstances);
      
      loadingToast.hide();
      
      showToast({
        style: Toast.Style.Success,
        title: "Instances loaded",
        message: `${fetchedInstances.length} instances found`,
      });
    } catch (error: any) {
      console.error("Error fetching instances:", error);
      
      loadingToast.hide();
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Fetch Instances",
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshInstances = useCallback(async () => {
    if (!service) return;
    await fetchInstances(service);
  }, [service, selectedZone]);

  const handleZoneChange = async (newZone: string | undefined) => {
    // Convert "all" to undefined for filtering
    const zoneFilter = newZone === "all" ? undefined : newZone;
    setSelectedZone(zoneFilter);
    
    if (service) {
      try {
        setIsLoading(true);
        
        const loadingToast = await showToast({
          style: Toast.Style.Animated,
          title: "Changing zone...",
          message: zoneFilter ? `Loading instances in ${zoneFilter}` : "Loading instances in all zones",
        });
        
        const fetchedInstances = await service.getInstances(zoneFilter);
        setInstances(fetchedInstances);
        
        loadingToast.hide();
        
        showToast({
          style: Toast.Style.Success,
          title: "Zone changed",
          message: `${fetchedInstances.length} instances found in ${zoneFilter || "all zones"}`,
        });
      } catch (error: any) {
        console.error("Error fetching instances:", error);
        
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Fetch Instances",
          message: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startInstance = async (instance: ComputeInstance) => {
    if (!service) return;
    
    try {
      setIsLoading(true);
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: `Starting ${instance.name}...`,
        message: `Zone: ${service.formatZone(instance.zone)}`,
      });
      
      const success = await service.startInstance(
        instance.name,
        service.formatZone(instance.zone)
      );
      
      loadingToast.hide();
      
      if (success) {
        showToast({
          style: Toast.Style.Success,
          title: `Started ${instance.name}`,
          message: `The instance should be running soon`,
        });
        
        // Refresh the instance list
        await refreshInstances();
      }
    } catch (error: any) {
      showToast({
        style: Toast.Style.Failure,
        title: `Failed to Start ${instance.name}`,
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopInstance = async (instance: ComputeInstance) => {
    if (!service) return;
    
    const shouldProceed = await confirmAlert({
      title: `Stop ${instance.name}?`,
      message: "This will stop the virtual machine. Are you sure?",
      primaryAction: {
        title: "Stop",
        style: Alert.ActionStyle.Destructive,
      },
    });
    
    if (!shouldProceed) return;
    
    try {
      setIsLoading(true);
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: `Stopping ${instance.name}...`,
        message: `Zone: ${service.formatZone(instance.zone)}`,
      });
      
      const success = await service.stopInstance(
        instance.name,
        service.formatZone(instance.zone)
      );
      
      loadingToast.hide();
      
      if (success) {
        showToast({
          style: Toast.Style.Success,
          title: `Stopped ${instance.name}`,
          message: "The instance has been stopped",
        });
        
        // Refresh the instance list
        await refreshInstances();
      }
    } catch (error: any) {
      showToast({
        style: Toast.Style.Failure,
        title: `Failed to Stop ${instance.name}`,
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Use the imported ComputeInstanceDetailView component
  const viewInstanceDetails = (instance: ComputeInstance) => {
    if (!service) return;
    push(<ComputeInstanceDetailView 
      instance={instance} 
      service={service} 
      onRefresh={refreshInstances} 
    />);
  };

  // Filter instances based on search text
  const filteredInstances = instances.filter((instance) =>
    instance.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === "running") return { source: Icon.Circle, tintColor: Color.Green };
    if (lowerStatus === "terminated" || lowerStatus === "stopped") return { source: Icon.Circle, tintColor: Color.Red };
    if (lowerStatus === "stopping" || lowerStatus === "starting") return { source: Icon.Circle, tintColor: Color.Orange };
    return { source: Icon.Circle, tintColor: Color.PrimaryText };
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search instances..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Zone"
          value={selectedZone || "all"}
          onChange={handleZoneChange}
        >
          <List.Dropdown.Item title="All Zones" value="all" />
          {zones.length === 0 ? (
            <List.Dropdown.Item title="Loading zones..." value="loading" />
          ) : (
            zones.map((zone) => (
              <List.Dropdown.Item
                key={zone}
                title={zone}
                value={zone}
              />
            ))
          )}
        </List.Dropdown>
      }
      navigationTitle="Compute Engine Instances"
      filtering={false}
      throttle
    >
      {filteredInstances.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No VM Instances Found"
          description={searchText ? "Try a different search term" : "Try selecting a different zone or create a new instance"}
          icon={{ source: Icon.Desktop }}
        />
      ) : (
        filteredInstances.map((instance) => (
          <List.Item
            key={instance.id || instance.name}
            title={instance.name}
            subtitle={service?.formatMachineType(instance.machineType) || ""}
            accessories={[
              { text: service?.formatZone(instance.zone) || "", tooltip: "Zone" },
              { text: instance.status, tooltip: "Status" },
            ]}
            icon={getStatusIcon(instance.status)}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Instance Actions">
                  <Action
                    title="View Instance Details"
                    icon={Icon.Eye}
                    onAction={() => viewInstanceDetails(instance)}
                  />
                  <Action
                    title="Refresh Instances"
                    icon={Icon.ArrowClockwise}
                    onAction={refreshInstances}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
                
                <ActionPanel.Section title="Power Actions">
                  {instance.status.toLowerCase() === "running" ? (
                    <Action
                      title="Stop Instance"
                      icon={{ source: Icon.Stop, tintColor: Color.Red }}
                      onAction={() => stopInstance(instance)}
                    />
                  ) : (
                    instance.status.toLowerCase() !== "starting" && (
                      <Action
                        title="Start Instance"
                        icon={{ source: Icon.Play, tintColor: Color.Green }}
                        onAction={() => startInstance(instance)}
                      />
                    )
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
} 