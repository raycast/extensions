import { useState, useEffect } from "react";
import { Detail, ActionPanel, Action, Icon, Toast, showToast, Color } from "@raycast/api";
import { ServiceHubService, GCPService } from "../ServiceHubService";

interface ServiceDetailsProps {
  service: GCPService;
  serviceHub: ServiceHubService;
  onServiceStatusChange: () => void;
}

export default function ServiceDetails({ service, serviceHub, onServiceStatusChange }: ServiceDetailsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [serviceDetails, setServiceDetails] = useState<GCPService | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchServiceDetails();
  }, [service.name]);
  
  async function fetchServiceDetails() {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the service data we already have while fetching details
      setServiceDetails(service);
      
      const details = await serviceHub.getServiceDetails(service.name);
      setServiceDetails(details);
    } catch (error) {
      console.error(`Error fetching details for service ${service.name}:`, error);
      setError(`Failed to fetch service details: ${error instanceof Error ? error.message : String(error)}`);
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch service details",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  async function toggleServiceStatus() {
    try {
      setIsLoading(true);
      
      if (serviceDetails?.isEnabled) {
        showToast({
          style: Toast.Style.Animated,
          title: `Disabling ${serviceDetails.displayName || serviceDetails.name}...`,
        });
        
        await serviceHub.disableService(serviceDetails.name);
        
        showToast({
          style: Toast.Style.Success,
          title: `Disabled ${serviceDetails.displayName || serviceDetails.name}`,
        });
      } else {
        showToast({
          style: Toast.Style.Animated,
          title: `Enabling ${service.displayName || service.name}...`,
        });
        
        await serviceHub.enableService(service.name);
        
        showToast({
          style: Toast.Style.Success,
          title: `Enabled ${service.displayName || service.name}`,
        });
      }
      
      // Refresh service details
      await fetchServiceDetails();
      
      // Notify parent component
      onServiceStatusChange();
    } catch (error) {
      console.error(`Error toggling service status for ${service.name}:`, error);
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update service status",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  // Generate markdown content for the detail view
  function getMarkdownContent() {
    if (!serviceDetails) {
      return "Loading service details...";
    }
    
    const statusColor = serviceDetails.isEnabled ? "green" : "red";
    const statusEmoji = serviceDetails.isEnabled ? "✅" : "❌";
    
    return `
# ${serviceDetails.displayName || serviceDetails.name}

<p align="center">
  <span style="color:${statusColor};font-size:16px;font-weight:bold;">
    ${statusEmoji} ${serviceDetails.isEnabled ? "Enabled" : "Disabled"}
  </span>
</p>

## Overview

**Category:** ${serviceDetails.category || "Other"}
**Service Name:** \`${serviceDetails.name}\`
**State:** ${serviceDetails.state || "Unknown"}

${serviceDetails.description || "No description available."}

${serviceDetails.dependsOn && serviceDetails.dependsOn.length > 0 ? `
## Dependencies

This service depends on the following services:

${serviceDetails.dependsOn.map(dep => `- \`${dep}\``).join("\n")}

${serviceDetails.isEnabled ? "" : "⚠️ **Note:** You must enable all dependencies before this service can function properly."}
` : ""}

## Actions

- Use **${serviceDetails.isEnabled ? "Disable" : "Enable"} Service** to ${serviceDetails.isEnabled ? "disable" : "enable"} this service
- Use **Refresh** to update the service information

## Keyboard Shortcuts

- ⌘ + E: ${serviceDetails.isEnabled ? "Disable" : "Enable"} Service
- ⌘ + R: Refresh
    `;
  }
  
  return (
    <Detail
      isLoading={isLoading}
      markdown={getMarkdownContent()}
      navigationTitle={serviceDetails?.displayName || service.displayName || service.name}
      metadata={
        serviceDetails ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Status"
              text={serviceDetails.isEnabled ? "Enabled" : "Disabled"}
              icon={{ source: serviceDetails.isEnabled ? Icon.CheckCircle : Icon.XmarkCircle, 
                     tintColor: serviceDetails.isEnabled ? Color.Green : Color.Red }}
            />
            <Detail.Metadata.Label title="Category" text={serviceDetails.category || "Other"} />
            <Detail.Metadata.Label title="Service Name" text={serviceDetails.name} />
            {serviceDetails.state && (
              <Detail.Metadata.Label title="State" text={serviceDetails.state} />
            )}
            {serviceDetails.dependsOn && serviceDetails.dependsOn.length > 0 && (
              <Detail.Metadata.TagList title="Dependencies">
                {serviceDetails.dependsOn.map((dep, index) => (
                  <Detail.Metadata.TagList.Item key={index} text={dep} />
                ))}
              </Detail.Metadata.TagList>
            )}
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <Action
            title={serviceDetails?.isEnabled ? "Disable Service" : "Enable Service"}
            icon={serviceDetails?.isEnabled ? Icon.XmarkCircle : Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={toggleServiceStatus}
          />
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={fetchServiceDetails}
          />
        </ActionPanel>
      }
    />
  );
} 