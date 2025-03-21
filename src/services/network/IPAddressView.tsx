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
  Clipboard,
} from "@raycast/api";
import { NetworkService, IPAddress } from "./NetworkService";

interface IPAddressViewProps {
  projectId: string;
  gcloudPath: string;
}

export default function IPAddressView({ projectId, gcloudPath }: IPAddressViewProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [ips, setIPs] = useState<IPAddress[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [service, setService] = useState<NetworkService | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | undefined>(undefined);
  const [regions, setRegions] = useState<string[]>([]);
  const { push } = useNavigation();

  useEffect(() => {
    // Initialize service with provided gcloudPath and projectId
    const networkService = new NetworkService(gcloudPath, projectId);
    setService(networkService);

    const initializeData = async () => {
      // Show initial loading toast
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading IP addresses...",
        message: "Please wait while we fetch your IP addresses"
      });
      
      try {
        // Fetch IPs
        const fetchedIPs = await networkService.getIPs();
        setIPs(fetchedIPs);
        
        // Fetch regions in the background
        fetchRegions(networkService);
        
        loadingToast.hide();
        
        showToast({
          style: Toast.Style.Success,
          title: "IP addresses loaded",
          message: `${fetchedIPs.length} IP addresses found`,
        });
      } catch (error: any) {
        console.error("Error initializing:", error);
        loadingToast.hide();
        
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load IP Addresses",
          message: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [gcloudPath, projectId]);
  
  const fetchRegions = async (networkService: NetworkService) => {
    try {
      const regionsList = await networkService.listRegions();
      setRegions(regionsList);
    } catch (error: any) {
      console.error("Error fetching regions:", error);
      // Don't show error toast for regions, as it's not critical
    }
  };

  const refreshIPs = useCallback(async () => {
    if (!service) return;
    
    setIsLoading(true);
    
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing IP addresses...",
      message: selectedRegion ? `Region: ${selectedRegion}` : "All regions"
    });
    
    try {
      const fetchedIPs = await service.getIPs(selectedRegion);
      setIPs(fetchedIPs);
      
      loadingToast.hide();
      
      showToast({
        style: Toast.Style.Success,
        title: "IP addresses refreshed",
        message: `${fetchedIPs.length} IP addresses found`,
      });
    } catch (error: any) {
      console.error("Error refreshing IPs:", error);
      
      loadingToast.hide();
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Refresh IP Addresses",
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [service, selectedRegion]);
  
  const handleRegionChange = async (newRegion: string | undefined) => {
    // Convert "all" to undefined for filtering
    const regionFilter = newRegion === "all" ? undefined : newRegion;
    setSelectedRegion(regionFilter);
    
    if (service) {
      try {
        setIsLoading(true);
        
        const loadingToast = await showToast({
          style: Toast.Style.Animated,
          title: "Changing region...",
          message: regionFilter ? `Loading IP addresses in ${regionFilter}` : "Loading IP addresses in all regions",
        });
        
        const fetchedIPs = await service.getIPs(regionFilter);
        setIPs(fetchedIPs);
        
        loadingToast.hide();
        
        showToast({
          style: Toast.Style.Success,
          title: "Region changed",
          message: `${fetchedIPs.length} IP addresses found in ${regionFilter || "all regions"}`,
        });
      } catch (error: any) {
        console.error("Error fetching IPs:", error);
        
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Fetch IP Addresses",
          message: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Filter IPs based on search text
  const filteredIPs = ips.filter((ip) =>
    ip.name.toLowerCase().includes(searchText.toLowerCase()) ||
    ip.address.toLowerCase().includes(searchText.toLowerCase())
  );
  
  const formatAddressType = (type: string) => {
    return type === "EXTERNAL" ? "External" : "Internal";
  };
  
  const formatStatus = (status: string) => {
    return status === "RESERVED" ? "Reserved" : "In Use";
  };
  
  const formatCreationTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };
  
  const formatRegion = (regionPath?: string) => {
    if (!regionPath) return "Global";
    const parts = regionPath.split('/');
    return parts[parts.length - 1];
  };
  
  const getStatusIcon = (status: string) => {
    return {
      source: Icon.Circle,
      tintColor: status === "RESERVED" ? Color.Green : Color.Blue
    };
  };
  
  const getAddressTypeIcon = (type: string) => {
    return {
      source: type === "EXTERNAL" ? Icon.Globe : Icon.ComputerChip,
      tintColor: type === "EXTERNAL" ? Color.Purple : Color.Orange
    };
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search IP addresses..."
      navigationTitle="IP Addresses"
      filtering={false}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Region"
          value={selectedRegion || "all"}
          onChange={(newValue) => handleRegionChange(newValue === "all" ? undefined : newValue)}
        >
          <List.Dropdown.Item title="All Regions" value="all" />
          {regions.length === 0 ? (
            <List.Dropdown.Item title="Loading regions..." value="loading" />
          ) : (
            regions.map((region) => (
              <List.Dropdown.Item
                key={region}
                title={region}
                value={region}
              />
            ))
          )}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refreshIPs}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action 
            title="Create IP Address"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => {
              if (regions.length === 0) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Cannot Create IP Address",
                  message: "Please wait for regions to be loaded"
                });
                return;
              }
              
              push(
                <CreateIPForm
                  gcloudPath={gcloudPath}
                  projectId={projectId}
                  regions={regions}
                  onIPCreated={refreshIPs}
                />
              );
            }}
          />
        </ActionPanel>
      }
    >
      {filteredIPs.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No IP Addresses Found"
          description={searchText ? "Try a different search term" : "Click the + button to create a new IP address"}
          icon={{ source: Icon.Globe }}
          actions={
            <ActionPanel>
              <Action
                title="Create IP Address"
                icon={Icon.Plus}
                onAction={() => {
                  if (regions.length === 0) {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Cannot Create IP Address",
                      message: "Please wait for regions to be loaded"
                    });
                    return;
                  }
                  
                  push(
                    <CreateIPForm
                      gcloudPath={gcloudPath}
                      projectId={projectId}
                      regions={regions}
                      onIPCreated={refreshIPs}
                    />
                  );
                }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refreshIPs}
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredIPs.map((ip) => (
          <List.Item
            key={ip.id || ip.name}
            title={ip.name}
            subtitle={ip.address}
            accessories={[
              { 
                text: formatAddressType(ip.addressType),
                icon: getAddressTypeIcon(ip.addressType),
                tooltip: "Address Type"
              },
              { 
                text: formatStatus(ip.status),
                icon: getStatusIcon(ip.status),
                tooltip: "Status"
              },
              { 
                text: formatRegion(ip.region),
                tooltip: "Region"
              },
            ]}
            icon={{ source: Icon.Network }}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="IP Address Details" />
                    <List.Item.Detail.Metadata.Label 
                      title="Name" 
                      text={ip.name} 
                    />
                    <List.Item.Detail.Metadata.Label 
                      title="IP Address" 
                      text={ip.address} 
                    />
                    <List.Item.Detail.Metadata.Label 
                      title="Description" 
                      text={ip.description || "No description"} 
                    />
                    <List.Item.Detail.Metadata.Label 
                      title="ID" 
                      text={ip.id} 
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Configuration" />
                    <List.Item.Detail.Metadata.Label 
                      title="Type" 
                      text={formatAddressType(ip.addressType)} 
                      icon={getAddressTypeIcon(ip.addressType)}
                    />
                    <List.Item.Detail.Metadata.Label 
                      title="Status" 
                      text={formatStatus(ip.status)} 
                      icon={getStatusIcon(ip.status)}
                    />
                    <List.Item.Detail.Metadata.Label 
                      title="Region" 
                      text={formatRegion(ip.region)} 
                    />
                    {ip.purpose && (
                      <List.Item.Detail.Metadata.Label 
                        title="Purpose" 
                        text={ip.purpose} 
                      />
                    )}
                    {ip.network && (
                      <List.Item.Detail.Metadata.Label 
                        title="Network" 
                        text={service?.formatNetwork(ip.network) || ip.network} 
                      />
                    )}
                    {ip.subnetwork && (
                      <List.Item.Detail.Metadata.Label 
                        title="Subnetwork" 
                        text={ip.subnetwork} 
                      />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    {ip.users && ip.users.length > 0 && (
                      <>
                        <List.Item.Detail.Metadata.Label title="Used By" />
                        {ip.users.map((user, index) => (
                          <List.Item.Detail.Metadata.Label 
                            key={index}
                            title={`Resource ${index + 1}`} 
                            text={user} 
                          />
                        ))}
                        <List.Item.Detail.Metadata.Separator />
                      </>
                    )}
                    <List.Item.Detail.Metadata.Label 
                      title="Created" 
                      text={formatCreationTime(ip.creationTimestamp)} 
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Copy IP Address"
                  icon={Icon.Clipboard}
                  onAction={() => {
                    // Use Raycast clipboard API
                    Clipboard.copy(ip.address);
                    showToast({
                      style: Toast.Style.Success,
                      title: "Copied to clipboard",
                      message: ip.address
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={refreshIPs}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action 
                  title="Create IP Address"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => {
                    if (regions.length === 0) {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Cannot Create IP Address",
                        message: "Please wait for regions to be loaded"
                      });
                      return;
                    }
                    
                    push(
                      <CreateIPForm
                        gcloudPath={gcloudPath}
                        projectId={projectId}
                        regions={regions}
                        onIPCreated={refreshIPs}
                      />
                    );
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

interface CreateIPFormProps {
  gcloudPath: string;
  projectId: string;
  regions: string[];
  onIPCreated: () => void;
}

function CreateIPForm({ gcloudPath, projectId, regions, onIPCreated }: CreateIPFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [addressType, setAddressType] = useState<string>("EXTERNAL");
  const [subnets, setSubnets] = useState<{ name: string; region: string }[]>([]);
  
  useEffect(() => {
    // Fetch subnets for internal addresses
    const fetchSubnets = async () => {
      try {
        const service = new NetworkService(gcloudPath, projectId);
        const allSubnets = await service.getSubnets();
        
        // Transform subnets to a more usable format
        const formattedSubnets = allSubnets.map(subnet => ({
          name: subnet.name,
          region: service.formatRegion(subnet.region)
        }));
        
        setSubnets(formattedSubnets);
      } catch (error) {
        console.error("Error fetching subnets:", error);
      }
    };
    
    fetchSubnets();
  }, [gcloudPath, projectId]);
  
  async function handleSubmit(values: {
    name: string;
    description: string;
    region: string;
    addressType: string;
    subnet?: string;
    specificAddress?: string;
    purpose?: string;
  }) {
    if (!values.name) {
      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Please enter an IP address name",
      });
      return;
    }
    
    if (!values.region) {
      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Please select a region",
      });
      return;
    }
    
    if (values.addressType === "INTERNAL" && !values.subnet) {
      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Please select a subnet for internal IP address",
      });
      return;
    }
    
    setIsLoading(true);
    
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating IP address...",
      message: `Creating ${values.name} in ${values.region}`
    });
    
    try {
      const service = new NetworkService(gcloudPath, projectId);
      
      const success = await service.createIP(
        values.name,
        values.region,
        values.addressType as "INTERNAL" | "EXTERNAL",
        {
          description: values.description,
          subnet: values.subnet,
          address: values.specificAddress,
          purpose: values.purpose
        }
      );
      
      loadingToast.hide();
      
      if (success) {
        showToast({
          style: Toast.Style.Success,
          title: "IP Address Created",
          message: `Successfully created ${values.name}`
        });
        
        onIPCreated();
        pop();
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Create IP Address",
          message: "An error occurred while creating the IP address"
        });
      }
    } catch (error: any) {
      console.error("Error creating IP address:", error);
      
      loadingToast.hide();
      
      showToast({
        style: Toast.Style.Failure,
        title: "Error Creating IP Address",
        message: error.message
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Get subnets for the selected region
  const getRegionSubnets = (region: string) => {
    return subnets.filter(subnet => subnet.region === region);
  };

  return (
    <Form
      navigationTitle="Create IP Address"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create IP Address"
            onSubmit={handleSubmit}
            icon={Icon.Network}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="IP Address Name"
        placeholder="my-ip-address"
        info="The name of the new IP address"
        autoFocus
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Optional description"
        info="A human-readable description for this IP address"
      />
      <Form.Dropdown
        id="region"
        title="Region"
        info="The region where the IP address will be created"
      >
        {regions.map(region => (
          <Form.Dropdown.Item
            key={region}
            value={region}
            title={region}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="addressType"
        title="Address Type"
        defaultValue="EXTERNAL"
        info="External IPs can be assigned to resources with internet access"
        onChange={setAddressType}
      >
        <Form.Dropdown.Item value="EXTERNAL" title="External" icon={Icon.Globe} />
        <Form.Dropdown.Item value="INTERNAL" title="Internal" icon={Icon.ComputerChip} />
      </Form.Dropdown>
      
      {addressType === "INTERNAL" && (
        <Form.Dropdown
          id="subnet"
          title="Subnet"
          info="The subnet to allocate the IP address from"
        >
          {subnets.length === 0 ? (
            <Form.Dropdown.Item value="" title="Loading subnets..." />
          ) : (
            subnets.map(subnet => (
              <Form.Dropdown.Item
                key={subnet.name}
                value={subnet.name}
                title={subnet.name}
              />
            ))
          )}
        </Form.Dropdown>
      )}
      
      {addressType === "INTERNAL" && (
        <Form.Dropdown
          id="purpose"
          title="Purpose"
          info="The purpose of this internal IP address"
          defaultValue=""
        >
          <Form.Dropdown.Item value="" title="Default" />
          <Form.Dropdown.Item value="GCE_ENDPOINT" title="GCE Endpoint" />
          <Form.Dropdown.Item value="DNS_RESOLVER" title="DNS Resolver" />
          <Form.Dropdown.Item value="VPC_PEERING" title="VPC Peering" />
          <Form.Dropdown.Item value="NAT_AUTO" title="NAT Auto" />
          <Form.Dropdown.Item value="IPSEC_INTERCONNECT" title="IPsec Interconnect" />
          <Form.Dropdown.Item value="SHARED_LOADBALANCER_VIP" title="Shared Loadbalancer VIP" />
        </Form.Dropdown>
      )}
      
      <Form.TextField
        id="specificAddress"
        title="Specific IP Address"
        placeholder="192.168.1.10"
        info="Optionally specify an exact address from the allowed range"
      />
    </Form>
  );
} 