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
  Clipboard,
  Form,
} from "@raycast/api";
import { NetworkService, VPCNetwork } from "./NetworkService";
import { SubnetworksView } from "./";
import { FirewallRulesView } from "./";
import { RoutesView } from "./";

interface VPCNetworksViewProps {
  projectId: string;
  gcloudPath: string;
}

export default function VPCNetworksView({ projectId, gcloudPath }: VPCNetworksViewProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [networks, setNetworks] = useState<VPCNetwork[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [service, setService] = useState<NetworkService | null>(null);
  const { push, pop } = useNavigation();

  useEffect(() => {
    // Initialize service with provided gcloudPath and projectId
    const networkService = new NetworkService(gcloudPath, projectId);
    setService(networkService);

    const initializeData = async () => {
      // Show initial loading toast
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading VPC Networks...",
        message: "Please wait while we fetch your networks"
      });
      
      try {
        // Set loading state immediately to show user something is happening
        setIsLoading(true);
        
        console.log(`Initializing network service for project: ${projectId}`);
        
        // Try to fetch networks with a timeout
        const fetchPromise = networkService.getVPCNetworks();
        
        // Set a timeout of 30 seconds to avoid UI hanging indefinitely
        const timeoutPromise = new Promise<VPCNetwork[]>((_, reject) => {
          setTimeout(() => reject(new Error("Fetch timeout - service may be unavailable")), 30000);
        });
        
        // Race the promises - use whichever completes first
        const fetchedNetworks = await Promise.race<VPCNetwork[]>([fetchPromise, timeoutPromise]);
        
        console.log(`Fetched ${fetchedNetworks.length} VPC networks`);
        setNetworks(fetchedNetworks);
        
        loadingToast.hide();
        
        if (fetchedNetworks.length === 0) {
          // If no networks found, show a more informative message
          showToast({
            style: Toast.Style.Success,
            title: "No networks found",
            message: "This project has no VPC networks"
          });
        } else {
          showToast({
            style: Toast.Style.Success,
            title: "Networks loaded",
            message: `${fetchedNetworks.length} networks found`,
          });
        }
      } catch (error: any) {
        console.error("Error initializing:", error);
        loadingToast.hide();
        
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
          // Generic error message
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load networks",
            message: error.message,
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeData();
  }, [gcloudPath, projectId]);

  const fetchNetworks = async () => {
    if (!service) return;
    
    try {
      setIsLoading(true);
      
      const fetchingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Refreshing networks...",
      });
      
      const fetchedNetworks = await service.getVPCNetworks();
      
      setNetworks(fetchedNetworks);
      
      fetchingToast.hide();
      
      // Show toast with number of networks found
      showToast({
        style: Toast.Style.Success,
        title: "Networks refreshed",
        message: `${fetchedNetworks.length} networks found`,
      });
    } catch (error: any) {
      console.error("Error fetching networks:", error);
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh networks",
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const viewSubnetworks = (network: VPCNetwork) => {
    if (!service) return;
    
    push(
      <SubnetworksView 
        projectId={projectId} 
        gcloudPath={gcloudPath} 
        networkName={network.name} 
      />
    );
  };

  const viewFirewallRules = (network: VPCNetwork) => {
    if (!service) return;
    
    push(
      <FirewallRulesView 
        projectId={projectId} 
        gcloudPath={gcloudPath} 
        networkName={network.name} 
      />
    );
  };

  const viewRoutes = (network: VPCNetwork) => {
    if (!service) return;
    
    push(
      <RoutesView 
        projectId={projectId} 
        gcloudPath={gcloudPath} 
        networkName={network.name} 
      />
    );
  };

  const createNetwork = () => {
    push(
      <CreateNetworkForm 
        projectId={projectId} 
        gcloudPath={gcloudPath} 
        onNetworkCreated={fetchNetworks} 
      />
    );
  };

  const deleteNetwork = async (network: VPCNetwork) => {
    if (!service) return;
    
    // Confirm deletion
    const shouldDelete = await confirmAlert({
      title: "Delete VPC Network",
      message: `Are you sure you want to delete network "${network.name}"? This can't be undone!`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    
    if (!shouldDelete) return;
    
    try {
      const deletingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting network...",
        message: network.name,
      });
      
      const success = await service.deleteVPCNetwork(network.name);
      
      deletingToast.hide();
      
      if (success) {
        showToast({
          style: Toast.Style.Success,
          title: "Network deleted",
          message: network.name,
        });
        
        // Refresh the list
        fetchNetworks();
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete network",
          message: "An error occurred",
        });
      }
    } catch (error: any) {
      console.error("Error deleting network:", error);
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete network",
        message: error.message,
      });
    }
  };

  // Get formatted metadata for detail view
  const getNetworkMetadata = (network: VPCNetwork) => {
    const metadata: { title: string; text: string; }[] = [
      { title: "ID", text: network.id },
      { title: "Name", text: network.name },
      { title: "Auto Create Subnets", text: network.autoCreateSubnets ? "Enabled" : "Disabled" },
      { title: "Routing Mode", text: network.routingMode || "Unknown" },
      { title: "MTU", text: network.mtu ? network.mtu.toString() : "Unknown" },
      { title: "Created", text: new Date(network.creationTimestamp).toLocaleString() },
    ];

    if (network.description) {
      metadata.push({ title: "Description", text: network.description });
    }

    return metadata;
  };

  // Check if there are any networks that match the search
  const filteredNetworks = networks.filter(network => 
    network.name.toLowerCase().includes(searchText.toLowerCase()) ||
    (network.description && network.description.toLowerCase().includes(searchText.toLowerCase()))
  );

  // Menu of actions for each network
  const getNetworkActions = (network: VPCNetwork) => (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title="View Subnets"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={() => viewSubnetworks(network)}
        />
        <Action
          title="View Firewall Rules"
          icon={Icon.Shield}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={() => viewFirewallRules(network)}
        />
        <Action
          title="View Routes"
          icon={Icon.Gauge}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => viewRoutes(network)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Refresh Networks"
          icon={Icon.RotateClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={fetchNetworks}
        />
        <Action
          title="Create Network"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={createNetwork}
        />
        <Action
          title="Delete Network"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
          onAction={() => deleteNetwork(network)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search networks..."
      navigationTitle="VPC Networks"
      actions={
        <ActionPanel>
          <Action 
            title="Create Network" 
            icon={Icon.Plus} 
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={createNetwork} 
          />
          <Action 
            title="Refresh" 
            icon={Icon.RotateClockwise} 
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={fetchNetworks} 
          />
        </ActionPanel>
      }
    >
      {filteredNetworks.length === 0 ? (
        <List.EmptyView
          title={searchText ? "No Matching Networks" : "No Networks Found"}
          description={searchText ? "Try a different search term" : "Create a new VPC network to get started"}
          icon={{ source: Icon.WifiDisabled, tintColor: Color.PrimaryText }}
          actions={
            <ActionPanel>
              <Action 
                title="Create Network" 
                icon={Icon.Plus} 
                onAction={createNetwork} 
              />
              <Action 
                title="Refresh" 
                icon={Icon.RotateClockwise} 
                onAction={fetchNetworks} 
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="VPC Networks" subtitle={`${filteredNetworks.length} networks`}>
          {filteredNetworks.map(network => (
            <List.Item
              key={network.id}
              title={network.name}
              subtitle={network.description || ""}
              icon={Icon.Network}
              accessories={[
                { 
                  text: network.autoCreateSubnets ? "Auto Subnet" : "Custom Subnet",
                  icon: network.autoCreateSubnets ? Icon.Check : Icon.Cog
                },
                { 
                  text: `MTU: ${network.mtu || "Default"}`,
                  icon: Icon.Gauge 
                }
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label 
                        title="Network Information" 
                        icon={Icon.Network} 
                      />
                      {getNetworkMetadata(network).map(item => (
                        <List.Item.Detail.Metadata.Label
                          key={item.title}
                          title={item.title}
                          text={item.text}
                        />
                      ))}
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label 
                        title="Subnetworks" 
                        icon={Icon.List} 
                      />
                      {network.subnetworks && network.subnetworks.length > 0 ? (
                        network.subnetworks.map((subnet, index) => {
                          const subnetName = subnet.split('/').pop() || subnet;
                          return (
                            <List.Item.Detail.Metadata.Label
                              key={index}
                              title={`Subnet ${index + 1}`}
                              text={subnetName}
                            />
                          );
                        })
                      ) : (
                        <List.Item.Detail.Metadata.Label
                          title="No Subnetworks"
                          text="This network has no subnetworks"
                        />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={getNetworkActions(network)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function CreateNetworkForm({ 
  projectId, 
  gcloudPath,
  onNetworkCreated 
}: { 
  projectId: string; 
  gcloudPath: string;
  onNetworkCreated: () => void;
}) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: {
    name: string;
    description: string;
    subnetMode: string;
    bgpRoutingMode: string;
    mtu: string;
  }) => {
    try {
      const creatingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating network...",
        message: values.name,
      });

      const service = new NetworkService(gcloudPath, projectId);
      
      const success = await service.createVPCNetwork(values.name, {
        description: values.description,
        subnetMode: values.subnetMode as 'auto' | 'custom',
        bgpRoutingMode: values.bgpRoutingMode as 'regional' | 'global',
        mtu: values.mtu ? parseInt(values.mtu) : undefined,
      });
      
      creatingToast.hide();
      
      if (success) {
        showToast({
          style: Toast.Style.Success,
          title: "Network created",
          message: values.name,
        });
        
        // Call the callback to refresh networks list
        onNetworkCreated();
        
        // Navigate back to the networks list
        pop();
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to create network",
          message: "An error occurred",
        });
      }
    } catch (error: any) {
      console.error("Error creating network:", error);
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create network",
        message: error.message,
      });
    }
  };

  return (
    <Form
      navigationTitle="Create VPC Network"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Network" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Network Name"
        placeholder="Enter network name"
        info="Network name must be unique within the project"
        autoFocus
        storeValue={false}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Enter network description (optional)"
        storeValue={false}
      />
      <Form.Dropdown
        id="subnetMode"
        title="Subnet Mode"
        storeValue={false}
        info="Auto mode creates subnets in each region automatically. Custom mode requires you to create subnets manually."
      >
        <Form.Dropdown.Item value="auto" title="Auto" />
        <Form.Dropdown.Item value="custom" title="Custom" />
      </Form.Dropdown>
      <Form.Dropdown
        id="bgpRoutingMode"
        title="Routing Mode"
        storeValue={false}
        info="Determines how routes are advertised between subnets"
      >
        <Form.Dropdown.Item value="regional" title="Regional" />
        <Form.Dropdown.Item value="global" title="Global" />
      </Form.Dropdown>
      <Form.TextField
        id="mtu"
        title="MTU"
        placeholder="1460 (default)"
        info="Maximum Transmission Unit (1460-8896)"
        storeValue={false}
      />
    </Form>
  );
} 