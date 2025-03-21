import { useEffect, useState } from "react";
import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { NetworkService, Subnetwork } from "./NetworkService";

interface SubnetworksViewProps {
  projectId: string;
  gcloudPath: string;
  networkName: string;
}

export default function SubnetworksView({ projectId, gcloudPath, networkName }: SubnetworksViewProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [subnetworks, setSubnetworks] = useState<Subnetwork[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [service, setService] = useState<NetworkService | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    // Initialize service
    const networkService = new NetworkService(gcloudPath, projectId);
    setService(networkService);

    fetchSubnetworks(networkService);
  }, [gcloudPath, projectId, networkName]);

  const fetchSubnetworks = async (networkService: NetworkService) => {
    try {
      setIsLoading(true);
      
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading subnetworks...",
        message: `For network: ${networkName}`
      });
      
      // Fetch all subnetworks
      const fetchedSubnetworks = await networkService.getSubnetworks();
      
      // Filter for the current network
      const filteredSubnetworks = fetchedSubnetworks.filter(
        subnet => networkService.formatNetworkName(subnet.network) === networkName
      );
      
      setSubnetworks(filteredSubnetworks);
      
      loadingToast.hide();
      
      if (filteredSubnetworks.length === 0) {
        showToast({
          style: Toast.Style.Success,
          title: "No subnetworks found",
          message: `Network "${networkName}" has no subnetworks`
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Subnetworks loaded",
          message: `${filteredSubnetworks.length} subnetworks found`,
        });
      }
    } catch (error: any) {
      console.error("Error fetching subnetworks:", error);
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load subnetworks",
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    if (!service) return;
    await fetchSubnetworks(service);
  };

  // Filter subnetworks by search text
  const filteredSubnetworks = subnetworks.filter(subnet => 
    subnet.name.toLowerCase().includes(searchText.toLowerCase()) ||
    subnet.ipCidrRange.includes(searchText)
  );

  // Get formatted metadata for detail view
  const getSubnetMetadata = (subnet: Subnetwork) => {
    const metadata: { title: string; text: string; }[] = [
      { title: "Name", text: subnet.name },
      { title: "Region", text: subnet.region.split('/').pop() || subnet.region },
      { title: "IP Range", text: subnet.ipCidrRange },
      { title: "Gateway IP", text: subnet.gatewayAddress },
      { title: "Private Google Access", text: subnet.privateIpGoogleAccess ? "Enabled" : "Disabled" },
      { title: "Created", text: new Date(subnet.creationTimestamp).toLocaleString() },
    ];

    if (subnet.purpose) {
      metadata.push({ title: "Purpose", text: subnet.purpose });
    }

    return metadata;
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search subnetworks..."
      navigationTitle={`Subnetworks - ${networkName}`}
      actions={
        <ActionPanel>
          <Action 
            title="Refresh" 
            icon={Icon.RotateClockwise} 
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refresh} 
          />
        </ActionPanel>
      }
    >
      {filteredSubnetworks.length === 0 ? (
        <List.EmptyView
          title={searchText ? "No Matching Subnetworks" : "No Subnetworks Found"}
          description={searchText ? "Try a different search term" : `Network "${networkName}" has no subnetworks`}
          icon={{ source: Icon.WifiDisabled, tintColor: Color.PrimaryText }}
          actions={
            <ActionPanel>
              <Action 
                title="Refresh" 
                icon={Icon.RotateClockwise} 
                onAction={refresh} 
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Subnetworks" subtitle={`${filteredSubnetworks.length} subnetworks`}>
          {filteredSubnetworks.map(subnet => (
            <List.Item
              key={subnet.id}
              title={subnet.name}
              subtitle={subnet.ipCidrRange}
              icon={Icon.List}
              accessories={[
                { 
                  text: subnet.region.split('/').pop() || subnet.region,
                  icon: Icon.Globe 
                },
                { 
                  text: subnet.privateIpGoogleAccess ? "Private Google Access" : "",
                  icon: subnet.privateIpGoogleAccess ? Icon.Lock : null
                }
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label 
                        title="Subnet Information" 
                        icon={Icon.List} 
                      />
                      {getSubnetMetadata(subnet).map(item => (
                        <List.Item.Detail.Metadata.Label
                          key={item.title}
                          title={item.title}
                          text={item.text}
                        />
                      ))}
                      
                      {subnet.secondaryIpRanges && subnet.secondaryIpRanges.length > 0 && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label 
                            title="Secondary IP Ranges" 
                            icon={Icon.Network} 
                          />
                          {subnet.secondaryIpRanges.map((range, index) => (
                            <List.Item.Detail.Metadata.Label
                              key={index}
                              title={range.rangeName}
                              text={range.ipCidrRange}
                            />
                          ))}
                        </>
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={refresh}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
} 