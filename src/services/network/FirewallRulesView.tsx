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
import { NetworkService, FirewallRule } from "./NetworkService";

interface FirewallRulesViewProps {
  projectId: string;
  gcloudPath: string;
  networkName: string;
}

export default function FirewallRulesView({ projectId, gcloudPath, networkName }: FirewallRulesViewProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [service, setService] = useState<NetworkService | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    // Initialize service
    const networkService = new NetworkService(gcloudPath, projectId);
    setService(networkService);

    fetchFirewallRules(networkService);
  }, [gcloudPath, projectId, networkName]);

  const fetchFirewallRules = async (networkService: NetworkService) => {
    try {
      setIsLoading(true);
      
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading firewall rules...",
        message: `For network: ${networkName}`
      });
      
      // Fetch firewall rules for the specified network
      const fetchedRules = await networkService.getFirewallRules(networkName);
      
      setRules(fetchedRules);
      
      loadingToast.hide();
      
      if (fetchedRules.length === 0) {
        showToast({
          style: Toast.Style.Success,
          title: "No firewall rules found",
          message: `Network "${networkName}" has no firewall rules`
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Firewall rules loaded",
          message: `${fetchedRules.length} rules found`,
        });
      }
    } catch (error: any) {
      console.error("Error fetching firewall rules:", error);
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load firewall rules",
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    if (!service) return;
    await fetchFirewallRules(service);
  };

  // Filter rules by search text
  const filteredRules = rules.filter(rule => 
    rule.name.toLowerCase().includes(searchText.toLowerCase()) ||
    (rule.description && rule.description.toLowerCase().includes(searchText.toLowerCase()))
  );

  // Format the traffic type (allowed or denied)
  const getTrafficType = (rule: FirewallRule) => {
    if (rule.allowed && rule.allowed.length > 0) {
      return "Allowed";
    } else if (rule.denied && rule.denied.length > 0) {
      return "Denied";
    } else {
      return "Unknown";
    }
  };

  // Get formatted traffic specification
  const getTrafficSpec = (rule: FirewallRule) => {
    const specs: string[] = [];
    
    if (rule.allowed) {
      rule.allowed.forEach(allow => {
        let spec = allow.IPProtocol;
        if (allow.ports && allow.ports.length > 0) {
          spec += `: ${allow.ports.join(', ')}`;
        }
        specs.push(`Allow ${spec}`);
      });
    }
    
    if (rule.denied) {
      rule.denied.forEach(deny => {
        let spec = deny.IPProtocol;
        if (deny.ports && deny.ports.length > 0) {
          spec += `: ${deny.ports.join(', ')}`;
        }
        specs.push(`Deny ${spec}`);
      });
    }
    
    return specs.join(', ');
  };

  // Get formatted metadata for detail view
  const getRuleMetadata = (rule: FirewallRule) => {
    const metadata: { title: string; text: string; }[] = [
      { title: "Name", text: rule.name },
      { title: "Network", text: rule.network.split('/').pop() || rule.network },
      { title: "Direction", text: rule.direction || "INGRESS" },
      { title: "Priority", text: rule.priority.toString() },
      { title: "Status", text: rule.disabled ? "Disabled" : "Enabled" },
      { title: "Traffic", text: getTrafficType(rule) },
    ];

    if (rule.description) {
      metadata.push({ title: "Description", text: rule.description });
    }

    return metadata;
  };
  
  // Get color for the rule based on its type
  const getRuleColor = (rule: FirewallRule): Color => {
    if (rule.disabled) {
      return Color.SecondaryText;
    }
    
    if (rule.denied && rule.denied.length > 0) {
      return Color.Red;
    }
    
    return Color.Green;
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search firewall rules..."
      navigationTitle={`Firewall Rules - ${networkName}`}
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
      {filteredRules.length === 0 ? (
        <List.EmptyView
          title={searchText ? "No Matching Rules" : "No Firewall Rules Found"}
          description={searchText ? "Try a different search term" : `Network "${networkName}" has no firewall rules`}
          icon={{ source: Icon.Shield, tintColor: Color.PrimaryText }}
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
        <List.Section title="Firewall Rules" subtitle={`${filteredRules.length} rules`}>
          {filteredRules.map(rule => (
            <List.Item
              key={rule.id}
              title={rule.name}
              subtitle={getTrafficSpec(rule)}
              icon={{ source: Icon.Shield, tintColor: getRuleColor(rule) }}
              accessories={[
                { 
                  text: rule.direction || "INGRESS",
                  icon: rule.direction === "EGRESS" ? Icon.ArrowUp : Icon.ArrowDown 
                },
                { 
                  text: `Priority: ${rule.priority}`,
                  icon: Icon.List 
                },
                {
                  icon: rule.disabled ? Icon.XmarkCircle : Icon.CheckCircle,
                  tooltip: rule.disabled ? "Disabled" : "Enabled"
                }
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label 
                        title="Firewall Rule Information" 
                        icon={Icon.Shield} 
                      />
                      {getRuleMetadata(rule).map(item => (
                        <List.Item.Detail.Metadata.Label
                          key={item.title}
                          title={item.title}
                          text={item.text}
                        />
                      ))}
                      
                      <List.Item.Detail.Metadata.Separator />
                      
                      {/* Source specifications */}
                      <List.Item.Detail.Metadata.Label 
                        title="Source Specifications" 
                        icon={Icon.Globe} 
                      />
                      
                      {rule.sourceRanges && rule.sourceRanges.length > 0 && (
                        <List.Item.Detail.Metadata.Label
                          title="Source IP Ranges"
                          text={rule.sourceRanges.join(", ")}
                        />
                      )}
                      
                      {rule.sourceTags && rule.sourceTags.length > 0 && (
                        <List.Item.Detail.Metadata.Label
                          title="Source Tags"
                          text={rule.sourceTags.join(", ")}
                        />
                      )}
                      
                      {rule.sourceServiceAccounts && rule.sourceServiceAccounts.length > 0 && (
                        <List.Item.Detail.Metadata.Label
                          title="Source Service Accounts"
                          text={rule.sourceServiceAccounts.join(", ")}
                        />
                      )}
                      
                      {/* Destination specifications */}
                      <List.Item.Detail.Metadata.Label 
                        title="Destination Specifications" 
                        icon={Icon.Globe} 
                      />
                      
                      {rule.destinationRanges && rule.destinationRanges.length > 0 && (
                        <List.Item.Detail.Metadata.Label
                          title="Destination IP Ranges"
                          text={rule.destinationRanges.join(", ")}
                        />
                      )}
                      
                      {rule.targetTags && rule.targetTags.length > 0 && (
                        <List.Item.Detail.Metadata.Label
                          title="Target Tags"
                          text={rule.targetTags.join(", ")}
                        />
                      )}
                      
                      {rule.targetServiceAccounts && rule.targetServiceAccounts.length > 0 && (
                        <List.Item.Detail.Metadata.Label
                          title="Target Service Accounts"
                          text={rule.targetServiceAccounts.join(", ")}
                        />
                      )}
                      
                      <List.Item.Detail.Metadata.Separator />
                      
                      {/* Traffic specifications */}
                      <List.Item.Detail.Metadata.Label 
                        title="Traffic Specifications" 
                        icon={Icon.Gauge} 
                      />
                      
                      {rule.allowed && rule.allowed.map((allow, index) => {
                        let spec = `Protocol: ${allow.IPProtocol}`;
                        if (allow.ports && allow.ports.length > 0) {
                          spec += `, Ports: ${allow.ports.join(", ")}`;
                        }
                        return (
                          <List.Item.Detail.Metadata.Label
                            key={`allow-${index}`}
                            title={`Allowed Traffic ${index + 1}`}
                            text={spec}
                          />
                        );
                      })}
                      
                      {rule.denied && rule.denied.map((deny, index) => {
                        let spec = `Protocol: ${deny.IPProtocol}`;
                        if (deny.ports && deny.ports.length > 0) {
                          spec += `, Ports: ${deny.ports.join(", ")}`;
                        }
                        return (
                          <List.Item.Detail.Metadata.Label
                            key={`deny-${index}`}
                            title={`Denied Traffic ${index + 1}`}
                            text={spec}
                          />
                        );
                      })}
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