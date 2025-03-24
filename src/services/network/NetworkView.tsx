import { useState, useEffect } from "react";
import { ActionPanel, Action, List, Icon, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import VPCView from "./VPCView";
import IPAddressView from "./IPAddressView";
import FirewallRulesView from "./FirewallRulesView";
import { NetworkService } from "./NetworkService";

interface NetworkViewProps {
  projectId: string;
  gcloudPath: string;
}

export default function NetworkView({ projectId, gcloudPath }: NetworkViewProps) {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Initialize service with provided gcloudPath and projectId
    const networkService = new NetworkService(gcloudPath, projectId);

    // Validate that we can access the network service
    const validateAccess = async () => {
      try {
        // Try to fetch VPCs as a test
        await networkService.getVPCs();
      } catch (error) {
        console.error("Error validating network access:", error);
        showFailureToast(error, {
          title: "Network Service Error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    validateAccess();
  }, [gcloudPath, projectId]);

  return (
    <List isLoading={isLoading} navigationTitle="Manage Networks" searchBarPlaceholder="Search network services...">
      <List.Section title="VPC Networks">
        <List.Item
          title="VPC Networks"
          subtitle="Create and manage VPC networks"
          icon={{ source: Icon.Network }}
          accessories={[{ icon: Icon.ChevronRight }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Vpc Networks"
                icon={Icon.Network}
                onAction={() => {
                  push(<VPCView projectId={projectId} gcloudPath={gcloudPath} />);
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="IP Addresses">
        <List.Item
          title="IP Addresses"
          subtitle="Reserve and manage static IP addresses"
          icon={{ source: Icon.Globe }}
          accessories={[{ icon: Icon.ChevronRight }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Ip Addresses"
                icon={Icon.Globe}
                onAction={() => {
                  push(<IPAddressView projectId={projectId} gcloudPath={gcloudPath} />);
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Firewall">
        <List.Item
          title="Firewall Rules"
          subtitle="Create and manage firewall rules"
          icon={{ source: Icon.Shield }}
          accessories={[{ icon: Icon.ChevronRight }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Firewall Rules"
                icon={Icon.Shield}
                onAction={() => {
                  push(<FirewallRulesView projectId={projectId} gcloudPath={gcloudPath} />);
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
