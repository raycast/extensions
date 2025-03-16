import { useState, useEffect } from "react";
import { Detail, ActionPanel, Action, Icon, Toast, showToast, Color } from "@raycast/api";
import { ServiceHubService, GCPService } from "../ServiceHubService";

interface ServiceDetailsProps {
  service: GCPService;
  serviceHub: ServiceHubService;
  onServiceStatusChange: (updatedService?: GCPService) => void;
}

export default function ServiceDetails({ service, serviceHub, onServiceStatusChange }: ServiceDetailsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [serviceDetails, setServiceDetails] = useState<GCPService | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  
  useEffect(() => {
    fetchServiceDetails();
  }, [service.name]);
  
  async function fetchServiceDetails() {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the service data we already have while fetching details
      setServiceDetails(service);
      
      // Check the current status directly
      const isEnabled = await serviceHub.isServiceEnabled(service.name);
      
      // If the status is different from what we have, update it
      if (isEnabled !== service.isEnabled) {
        const updatedService = {
          ...service,
          isEnabled,
          state: isEnabled ? "ENABLED" : "NOT_ACTIVATED"
        };
        setServiceDetails(updatedService);
        
        // Notify parent of the status change
        onServiceStatusChange(updatedService);
      } else {
        // Fetch full details
        const details = await serviceHub.getServiceDetails(service.name);
        setServiceDetails(details);
      }
    } catch (error) {
      console.error(`Error fetching details for service ${service.name}:`, error);
      setError(`Failed to fetch service details: ${error instanceof Error ? error.message : String(error)}`);
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch service details",
        message: error instanceof Error ? error.message : String(error),
      });
      
      // Use the service data we already have
      setServiceDetails(service);
    } finally {
      setIsLoading(false);
    }
  }
  
  async function toggleServiceStatus() {
    if (isToggling) return;
    
    try {
      setIsToggling(true);
      
      if (serviceDetails?.isEnabled) {
        showToast({
          style: Toast.Style.Animated,
          title: `Disabling ${serviceDetails.displayName || serviceDetails.name}...`,
        });
        
        await serviceHub.disableService(serviceDetails.name);
        
        // Verify the service was actually disabled
        const isStillEnabled = await serviceHub.isServiceEnabled(serviceDetails.name);
        
        if (!isStillEnabled) {
          showToast({
            style: Toast.Style.Success,
            title: `Disabled ${serviceDetails.displayName || serviceDetails.name}`,
          });
          
          // Update local state
          if (serviceDetails) {
            const updatedService = {
              ...serviceDetails,
              isEnabled: false,
              state: "DISABLED"
            };
            setServiceDetails(updatedService);
            
            // Notify parent component with updated service
            onServiceStatusChange(updatedService);
          }
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: `Failed to disable ${serviceDetails.displayName || serviceDetails.name}`,
            message: "Service did not disable properly. Try again or check GCP Console."
          });
        }
      } else {
        showToast({
          style: Toast.Style.Animated,
          title: `Enabling ${service.displayName || service.name}...`,
        });
        
        await serviceHub.enableService(service.name);
        
        // Verify the service was actually enabled
        const isNowEnabled = await serviceHub.isServiceEnabled(service.name);
        
        if (isNowEnabled) {
          showToast({
            style: Toast.Style.Success,
            title: `Enabled ${service.displayName || service.name}`,
          });
          
          // Update local state
          if (serviceDetails) {
            const updatedService = {
              ...serviceDetails,
              isEnabled: true,
              state: "ENABLED"
            };
            setServiceDetails(updatedService);
            
            // Notify parent component with updated service
            onServiceStatusChange(updatedService);
          }
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: `Failed to enable ${service.displayName || service.name}`,
            message: "Service did not enable properly. Try again or check GCP Console."
          });
        }
      }
      
      // Refresh service details
      await fetchServiceDetails();
    } catch (error) {
      console.error(`Error toggling service status for ${service.name}:`, error);
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update service status",
        message: error instanceof Error ? error.message : String(error),
      });
      
      // Notify parent component of failure
      onServiceStatusChange();
    } finally {
      setIsToggling(false);
    }
  }
  
  function openDocumentation() {
    if (serviceDetails?.documentation) {
      // Use the Detail.Metadata.Link component instead of openInBrowser
      // The link will be opened by the user clicking on it
    }
  }
  
  function openConsole() {
    if (serviceDetails?.console) {
      // Use the Detail.Metadata.Link component instead of openInBrowser
      // The link will be opened by the user clicking on it
    }
  }
  
  // Generate markdown content for the detail view
  function getMarkdownContent() {
    if (!serviceDetails) {
      return "Loading service details...";
    }
    
    const statusEmoji = serviceDetails.isEnabled ? "✅" : "";
    
    return `
# ${serviceDetails.displayName || serviceDetails.name} ${statusEmoji}

## Overview

**Service Name:** \`${serviceDetails.name}\`
**Category:** ${serviceDetails.category || "Other"}

${serviceDetails.description || "No description available."}

${serviceDetails.dependsOn && serviceDetails.dependsOn.length > 0 ? `
## Dependencies

This service depends on the following services:

${serviceDetails.dependsOn.map(dep => `- \`${dep}\``).join("\n")}

${serviceDetails.isEnabled ? "" : "⚠️ **Note:** You must enable all dependencies before this service can function properly."}
` : ""}

## Links

${serviceDetails.documentation ? `- [Documentation](${serviceDetails.documentation})` : ""}
${serviceDetails.console ? `- [Google Cloud Console](${serviceDetails.console})` : ""}

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
            {serviceDetails.isEnabled && (
              <Detail.Metadata.Label
                title="Status"
                icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              />
            )}
            <Detail.Metadata.Label title="Service Name" text={serviceDetails.name} />
            <Detail.Metadata.Label title="Category" text={serviceDetails.category || "Other"} />
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
            {serviceDetails.documentation && (
              <Detail.Metadata.Link
                title="Documentation"
                target={serviceDetails.documentation}
                text="View Documentation"
              />
            )}
            {serviceDetails.console && (
              <Detail.Metadata.Link
                title="Console"
                target={serviceDetails.console}
                text="Open in Google Cloud Console"
              />
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