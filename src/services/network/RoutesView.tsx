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
import { NetworkService, Route } from "./NetworkService";

interface RoutesViewProps {
  projectId: string;
  gcloudPath: string;
  networkName: string;
}

export default function RoutesView({ projectId, gcloudPath, networkName }: RoutesViewProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [service, setService] = useState<NetworkService | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    // Initialize service
    const networkService = new NetworkService(gcloudPath, projectId);
    setService(networkService);

    fetchRoutes(networkService);
  }, [gcloudPath, projectId, networkName]);

  const fetchRoutes = async (networkService: NetworkService) => {
    try {
      setIsLoading(true);
      
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading routes...",
        message: `For network: ${networkName}`
      });
      
      // Fetch routes for the specified network
      const fetchedRoutes = await networkService.getRoutes(networkName);
      
      setRoutes(fetchedRoutes);
      
      loadingToast.hide();
      
      if (fetchedRoutes.length === 0) {
        showToast({
          style: Toast.Style.Success,
          title: "No routes found",
          message: `Network "${networkName}" has no routes`
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Routes loaded",
          message: `${fetchedRoutes.length} routes found`,
        });
      }
    } catch (error: any) {
      console.error("Error fetching routes:", error);
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load routes",
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    if (!service) return;
    await fetchRoutes(service);
  };

  // Filter routes by search text
  const filteredRoutes = routes.filter(route => 
    route.name.toLowerCase().includes(searchText.toLowerCase()) ||
    route.destRange.includes(searchText) ||
    (route.description && route.description.toLowerCase().includes(searchText.toLowerCase()))
  );

  // Get the next hop description
  const getNextHopDescription = (route: Route): string => {
    if (route.nextHopGateway) {
      return `Gateway: ${route.nextHopGateway.split('/').pop() || route.nextHopGateway}`;
    }
    if (route.nextHopInstance) {
      return `Instance: ${route.nextHopInstance.split('/').pop() || route.nextHopInstance}`;
    }
    if (route.nextHopIp) {
      return `IP: ${route.nextHopIp}`;
    }
    if (route.nextHopVpnTunnel) {
      return `VPN Tunnel: ${route.nextHopVpnTunnel.split('/').pop() || route.nextHopVpnTunnel}`;
    }
    if (route.nextHopIlb) {
      return `Internal LB: ${route.nextHopIlb.split('/').pop() || route.nextHopIlb}`;
    }
    if (route.nextHopNetwork) {
      return `Network: ${route.nextHopNetwork.split('/').pop() || route.nextHopNetwork}`;
    }
    return "Unknown";
  };

  // Get icon for next hop type
  const getNextHopIcon = (route: Route): Icon => {
    if (route.nextHopGateway) {
      return Icon.Globe;
    }
    if (route.nextHopInstance) {
      return Icon.Desktop;
    }
    if (route.nextHopIp) {
      return Icon.Dot;
    }
    if (route.nextHopVpnTunnel) {
      return Icon.Lock;
    }
    if (route.nextHopIlb) {
      return Icon.CircleProgress;
    }
    return Icon.Network;
  };

  // Get formatted metadata for detail view
  const getRouteMetadata = (route: Route) => {
    const metadata: { title: string; text: string; }[] = [
      { title: "Name", text: route.name },
      { title: "Network", text: route.network.split('/').pop() || route.network },
      { title: "Destination Range", text: route.destRange },
      { title: "Priority", text: route.priority.toString() },
      { title: "Next Hop", text: getNextHopDescription(route) },
      { title: "Created", text: new Date(route.creationTimestamp).toLocaleString() },
    ];

    if (route.description) {
      metadata.push({ title: "Description", text: route.description });
    }

    if (route.tags && route.tags.length > 0) {
      metadata.push({ title: "Tags", text: route.tags.join(", ") });
    }

    return metadata;
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search routes..."
      navigationTitle={`Routes - ${networkName}`}
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
      {filteredRoutes.length === 0 ? (
        <List.EmptyView
          title={searchText ? "No Matching Routes" : "No Routes Found"}
          description={searchText ? "Try a different search term" : `Network "${networkName}" has no routes`}
          icon={{ source: Icon.Gauge, tintColor: Color.PrimaryText }}
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
        <List.Section title="Routes" subtitle={`${filteredRoutes.length} routes`}>
          {filteredRoutes.map(route => (
            <List.Item
              key={route.id}
              title={route.name}
              subtitle={route.destRange}
              icon={{ source: Icon.Gauge, tintColor: Color.Blue }}
              accessories={[
                { 
                  text: getNextHopDescription(route),
                  icon: getNextHopIcon(route)
                },
                {
                  text: `Priority: ${route.priority}`,
                  icon: Icon.List
                }
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label 
                        title="Route Information" 
                        icon={Icon.Gauge} 
                      />
                      {getRouteMetadata(route).map(item => (
                        <List.Item.Detail.Metadata.Label
                          key={item.title}
                          title={item.title}
                          text={item.text}
                        />
                      ))}
                      
                      {route.tags && route.tags.length > 0 && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label 
                            title="Instance Tags" 
                            icon={Icon.Tag} 
                          />
                          {route.tags.map((tag, index) => (
                            <List.Item.Detail.Metadata.Label
                              key={index}
                              title={`Tag ${index + 1}`}
                              text={tag}
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