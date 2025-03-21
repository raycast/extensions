import { useEffect, useState, useCallback } from "react";
import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  Toast,
  showToast,
  Form,
  useNavigation,
} from "@raycast/api";
import { NetworkService, Subnet, VPC } from "./NetworkService";
import { getAllRegions, getRegionByName } from "../../utils/regions";

interface SubnetsViewProps {
  projectId: string;
  gcloudPath: string;
  vpc: VPC;
}

export default function SubnetsView({ projectId, gcloudPath, vpc }: SubnetsViewProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [subnets, setSubnets] = useState<Subnet[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [service, setService] = useState<NetworkService | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    // Initialize service with provided gcloudPath and projectId
    const networkService = new NetworkService(gcloudPath, projectId);
    setService(networkService);

    const initializeData = async () => {
      // Show initial loading toast
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading subnets...",
        message: `Please wait while we fetch subnets for ${vpc.name}`
      });
      
      try {
        // Fetch all subnets
        const fetchedSubnets = await networkService.getSubnets();
        
        // Filter by network (vpc)
        const filteredSubnets = fetchedSubnets.filter(subnet => 
          subnet.network.includes(`/${vpc.name}`) || 
          subnet.network === vpc.name
        );
        
        setSubnets(filteredSubnets);
        
        loadingToast.hide();
        
        showToast({
          style: Toast.Style.Success,
          title: "Subnets loaded",
          message: `${filteredSubnets.length} subnets found for ${vpc.name}`,
        });
      } catch (error: any) {
        console.error("Error initializing:", error);
        loadingToast.hide();
        
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load Subnets",
          message: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [gcloudPath, projectId, vpc]);

  const refreshSubnets = useCallback(async () => {
    if (!service) return;
    
    setIsLoading(true);
    
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing subnets...",
    });
    
    try {
      // Force refresh subnets to avoid cache issues
      await service.forceRefreshSubnets();
      
      // Now fetch the subnets which should get fresh data
      const fetchedSubnets = await service.getSubnets();
      
      // Filter by network (vpc)
      const filteredSubnets = fetchedSubnets.filter(subnet => 
        subnet.network.includes(`/${vpc.name}`) || 
        subnet.network === vpc.name
      );
      
      setSubnets(filteredSubnets);
      
      loadingToast.hide();
      
      showToast({
        style: Toast.Style.Success,
        title: "Subnets refreshed",
        message: `${filteredSubnets.length} subnets found for ${vpc.name}`,
      });
    } catch (error: any) {
      console.error("Error refreshing subnets:", error);
      
      loadingToast.hide();
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Refresh Subnets",
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [service, vpc]);

  // Filter subnets based on search text
  const filteredSubnets = subnets.filter((subnet) =>
    subnet.name.toLowerCase().includes(searchText.toLowerCase()) ||
    subnet.region.toLowerCase().includes(searchText.toLowerCase()) ||
    subnet.ipCidrRange.includes(searchText)
  );
  
  const formatRegion = (regionPath: string) => {
    if (!service) return regionPath;
    return service.formatRegion(regionPath);
  };
  
  const formatNetwork = (networkPath: string) => {
    if (!service) return networkPath;
    return service.formatNetwork(networkPath);
  };
  
  const formatCreationTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };
  
  const getPrivateGoogleAccessIcon = (enabled: boolean) => {
    return {
      source: Icon.LockUnlocked,
      tintColor: enabled ? Color.Green : Color.SecondaryText
    };
  };
  
  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Subnets for ${vpc.name}`}
      searchBarPlaceholder="Search subnets by name, region, or CIDR range..."
      onSearchTextChange={setSearchText}
    >
      {filteredSubnets.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Subnets Found"
          description={searchText ? "Try a different search term" : `No subnets found for ${vpc.name}`}
          icon={{ source: Icon.WifiDisabled }}
          actions={
            <ActionPanel>
              <Action
                title="Create Subnet"
                icon={Icon.Plus}
                onAction={() => {
                  push(
                    <CreateSubnetForm
                      gcloudPath={gcloudPath}
                      projectId={projectId}
                      vpc={vpc}
                      onSubnetCreated={refreshSubnets}
                    />
                  );
                }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refreshSubnets}
              />
            </ActionPanel>
          }
        />
      ) :
        filteredSubnets.map((subnet) => (
          <List.Item
            key={subnet.id || subnet.name}
            title={subnet.name}
            subtitle={subnet.ipCidrRange}
            accessories={[
              { 
                text: formatRegion(subnet.region),
                icon: { source: Icon.Globe }
              },
              { 
                text: subnet.privateIpGoogleAccess ? "Private Google Access" : "",
                icon: getPrivateGoogleAccessIcon(subnet.privateIpGoogleAccess)
              },
            ]}
            icon={{ source: Icon.Network }}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Subnet Details" />
                    <List.Item.Detail.Metadata.Label 
                      title="Name" 
                      text={subnet.name} 
                    />
                    <List.Item.Detail.Metadata.Label 
                      title="Network" 
                      text={formatNetwork(subnet.network)} 
                    />
                    <List.Item.Detail.Metadata.Label 
                      title="Region" 
                      text={formatRegion(subnet.region)} 
                    />
                    <List.Item.Detail.Metadata.Label 
                      title="IP Range" 
                      text={subnet.ipCidrRange} 
                    />
                    <List.Item.Detail.Metadata.Label 
                      title="Gateway Address" 
                      text={subnet.gatewayAddress || "Not specified"} 
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Configuration" />
                    <List.Item.Detail.Metadata.Label 
                      title="Private Google Access" 
                      text={subnet.privateIpGoogleAccess ? "Enabled" : "Disabled"} 
                      icon={getPrivateGoogleAccessIcon(subnet.privateIpGoogleAccess)}
                    />
                    <List.Item.Detail.Metadata.Label 
                      title="Flow Logs" 
                      text={subnet.enableFlowLogs ? "Enabled" : "Disabled"} 
                    />
                    {subnet.secondaryIpRanges && subnet.secondaryIpRanges.length > 0 && (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Secondary IP Ranges" />
                        {subnet.secondaryIpRanges.map((range, index) => (
                          <List.Item.Detail.Metadata.Label 
                            key={`range-${index}`}
                            title={range.rangeName} 
                            text={range.ipCidrRange} 
                          />
                        ))}
                      </>
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label 
                      title="Created" 
                      text={formatCreationTime(subnet.creationTimestamp)} 
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={refreshSubnets}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action 
                  title="Create Subnet"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => {
                    push(
                      <CreateSubnetForm
                        gcloudPath={gcloudPath}
                        projectId={projectId}
                        vpc={vpc}
                        onSubnetCreated={refreshSubnets}
                      />
                    );
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      }
    </List>
  );
}

interface CreateSubnetFormProps {
  gcloudPath: string;
  projectId: string;
  vpc: VPC;
  onSubnetCreated: () => void;
}

function CreateSubnetForm({ gcloudPath, projectId, vpc, onSubnetCreated }: CreateSubnetFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [regions] = useState<string[]>(getAllRegions());
  
  async function handleSubmit(values: {
    name: string;
    region: string;
    ipRange: string;
    privateGoogleAccess: boolean;
    enableFlowLogs: boolean;
    secondaryRanges?: string; // Format: "name1:cidr1,name2:cidr2"
  }) {
    if (!values.name) {
      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Please enter a subnet name",
      });
      return;
    }
    
    if (!values.ipRange || !values.ipRange.includes('/')) {
      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Please enter a valid IP range (e.g., 10.0.0.0/24)",
      });
      return;
    }
    
    setIsLoading(true);
    
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating subnet...",
      message: `Creating ${values.name} in ${values.region}`
    });
    
    try {
      const service = new NetworkService(gcloudPath, projectId);
      
      // Parse secondary ranges
      const secondaryRanges = values.secondaryRanges ? 
        values.secondaryRanges.split(',').map(range => {
          const [name, cidr] = range.split(':');
          return { rangeName: name.trim(), ipCidrRange: cidr.trim() };
        }) : undefined;
      
      const success = await service.createSubnet(
        values.name,
        vpc.name,
        values.region,
        values.ipRange,
        values.privateGoogleAccess,
        values.enableFlowLogs,
        secondaryRanges
      );
      
      loadingToast.hide();
      
      if (success) {
        showToast({
          style: Toast.Style.Success,
          title: "Subnet Created",
          message: `Successfully created ${values.name} in ${values.region}`
        });
        
        // Force clear the subnet cache
        await service.forceRefreshSubnets();
        
        // Add a slight delay before refreshing to ensure the subnet is available
        setTimeout(() => {
          onSubnetCreated();
          pop();
        }, 2000);
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Create Subnet",
          message: "An error occurred while creating the subnet"
        });
      }
    } catch (error: any) {
      console.error("Error creating subnet:", error);
      
      loadingToast.hide();
      
      showToast({
        style: Toast.Style.Failure,
        title: "Error Creating Subnet",
        message: error.message
      });
    } finally {
      setIsLoading(false);
    }
  }

  const formatRegionForDropdown = (regionName: string): string => {
    const regionDetails = getRegionByName(regionName);
    return regionDetails ? `${regionName} (${regionDetails.description})` : regionName;
  };

  return (
    <Form
      navigationTitle="Create Subnet"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Subnet"
            onSubmit={handleSubmit}
            icon={Icon.Network}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Subnet Name"
        placeholder="my-subnet"
        info="The name of the new subnet"
        autoFocus
      />
      <Form.Dropdown
        id="region"
        title="Region"
        info="The region where the subnet will be created"
      >
        {regions.map(region => (
          <Form.Dropdown.Item key={region} value={region} title={formatRegionForDropdown(region)} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="ipRange"
        title="IP Range"
        placeholder="10.0.0.0/24"
        info="IP range in CIDR format (e.g., 10.0.0.0/24)"
      />
      <Form.Checkbox
        id="privateGoogleAccess"
        label="Enable Private Google Access"
        info="Allows VMs in this subnet to reach Google APIs and services using private IP addresses"
      />
      <Form.Checkbox
        id="enableFlowLogs"
        label="Enable Flow Logs"
        info="Enables VPC flow logs for network monitoring"
      />
      <Form.TextField
        id="secondaryRanges"
        title="Secondary Ranges (Optional)"
        placeholder="services:10.0.1.0/24,pods:10.0.2.0/24"
        info="Format: name:cidr,name:cidr"
      />
    </Form>
  );
} 