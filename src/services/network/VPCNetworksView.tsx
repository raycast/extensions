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
        
        // Try to fetch networks with a timeout, including shared networks
        const fetchPromise = networkService.getVPCNetworks(true);
        
        // Set a timeout of 30 seconds to avoid UI hanging indefinitely
        const timeoutPromise = new Promise<VPCNetwork[]>((_, reject) => {
          setTimeout(() => reject(new Error("Fetch timeout - service may be unavailable")), 30000);
        });
        
        // Race the promises - use whichever completes first
        const fetchedNetworks = await Promise.race<VPCNetwork[]>([fetchPromise, timeoutPromise]);
        
        console.log(`Fetched ${fetchedNetworks.length} VPC networks (including shared networks)`);
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
      
      const fetchedNetworks = await service.getVPCNetworks(true);
      
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
    const metadata = [
      {
        title: "ID",
        value: network.id,
      },
      {
        title: "Subnet Mode",
        value: network.autoCreateSubnets ? "Auto" : "Custom",
        icon: { source: Icon.Wand },
      },
      {
        title: "Routing Mode",
        value: network.routingMode,
        icon: { source: Icon.Globe },
      },
      {
        title: "MTU",
        value: network.mtu.toString(),
        icon: { source: Icon.Gauge },
      },
      {
        title: "Created",
        value: new Date(network.creationTimestamp).toLocaleString(),
        icon: { source: Icon.Calendar },
      },
    ];
    
    // Add shared network information if applicable
    if (network.isShared) {
      if (network.sharedFromProject) {
        metadata.push({
          title: "Shared From",
          value: network.sharedFromProject,
          icon: { source: Icon.Link },
        });
      }
      
      if (network.sharedWithProject) {
        metadata.push({
          title: "Shared With",
          value: network.sharedWithProject,
          icon: { source: Icon.Link },
        });
      }
    }
    
    return metadata;
  };

  // Filter networks based on search text
  const filteredNetworks = networks.filter((network) => {
    if (!searchText) return true;
    
    const searchTextLower = searchText.toLowerCase();
    
    return (
      network.name.toLowerCase().includes(searchTextLower) ||
      network.id.toLowerCase().includes(searchTextLower) ||
      (network.description || "").toLowerCase().includes(searchTextLower) ||
      (network.isShared ? "shared".includes(searchTextLower) : false) ||
      (network.sharedFromProject || "").toLowerCase().includes(searchTextLower) ||
      (network.sharedWithProject || "").toLowerCase().includes(searchTextLower)
    );
  });

  // Menu of actions for each network
  const getNetworkActions = (network: VPCNetwork) => (
    <ActionPanel title={`Actions for ${network.name}`}>
      <ActionPanel.Section title="Network Management">
        <Action
          title="View Subnets"
          icon={Icon.List}
          onAction={() => viewSubnetworks(network)}
        />
        <Action
          title="View Firewall Rules"
          icon={Icon.Shield}
          onAction={() => viewFirewallRules(network)}
        />
        <Action
          title="View Routes"
          icon={Icon.Gauge}
          onAction={() => viewRoutes(network)}
        />
        <Action
          title="Refresh Networks"
          icon={Icon.RotateClockwise}
          onAction={fetchNetworks}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
        <Action
          title="Create Network"
          icon={Icon.Plus}
          onAction={createNetwork}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
        {!network.isShared && (
          <Action
            title="Delete Network"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => deleteNetwork(network)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
          />
        )}
      </ActionPanel.Section>
      
      <ActionPanel.Section title="Clipboard Actions">
        <Action
          title="Copy Network Name"
          icon={Icon.Clipboard}
          onAction={() => {
            Clipboard.copy(network.name);
            showToast({
              style: Toast.Style.Success,
              title: "Copied to clipboard",
              message: network.name,
            });
          }}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action
          title="Copy Network ID"
          icon={Icon.Clipboard}
          onAction={() => {
            Clipboard.copy(network.id);
            showToast({
              style: Toast.Style.Success,
              title: "Copied to clipboard",
              message: network.id,
            });
          }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search VPC Networks..."
      throttle
    >
      <List.Section title="VPC Networks" subtitle={`${filteredNetworks.length} networks`}>
        {filteredNetworks.map((network) => (
          <List.Item
            key={network.id}
            title={network.name}
            subtitle={network.description || (network.autoCreateSubnets ? "Auto Mode" : "Custom Mode")}
            icon={network.isShared ? 
              { source: Icon.Network } : 
              { source: Icon.Network }}
            accessories={[
              { 
                text: network.isShared ? 
                  (network.sharedFromProject ? `Shared from ${network.sharedFromProject}` : 
                    network.sharedWithProject ? `Shared with other projects` : "Shared VPC") : 
                  `${network.subnetworks?.length || 0} subnet(s)`,
                icon: network.isShared ? 
                  { source: Icon.Link } : 
                  { source: Icon.List }
              },
              { 
                text: network.routingMode === "GLOBAL" ? "Global Routing" : "Regional Routing",
                icon: { source: Icon.Globe }
              }
            ]}
            actions={getNetworkActions(network)}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    {getNetworkMetadata(network).map((item) => (
                      <List.Item.Detail.Metadata.Label
                        key={item.title}
                        title={item.title}
                        text={item.value}
                        icon={item.icon}
                      />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
      </List.Section>
      
      <List.EmptyView
        title="No Networks Found"
        description={searchText ? "Try a different search term" : "Create a new VPC network"}
        icon={{ source: Icon.Network, tintColor: Color.PrimaryText }}
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