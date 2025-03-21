import { ActionPanel, Action, List, Icon, useNavigation, Cache, showToast, Toast, Color } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { StorageBucketView, IAMMembersByPrincipalView } from "./services/storage";
import { IAMView } from "./services/iam";
import { ServiceHubView } from "./services/servicehub";
import { ComputeInstancesView, ComputeDisksView } from "./services/compute";
import { NetworkView, VPCView, IPAddressView, FirewallRulesView } from "./services/network";
import { executeGcloudCommand, getProjects } from "./gcloud";
import { CacheManager } from "./utils/CacheManager";

// Create a cache instance for project details
const cache = new Cache({ namespace: "project-details" });
// Cache expiration time in milliseconds (1 hour)
const CACHE_TTL = 3600000;

interface ProjectViewProps {
  projectId: string;
  gcloudPath: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  icon: Icon;
}

// Pre-define services to avoid recreating them on each render
const AVAILABLE_SERVICES: Service[] = [
  { 
    id: "storage", 
    name: "Cloud Storage", 
    description: "Object storage for companies of all sizes",
    icon: Icon.Box
  },
  {
    id: "iam",
    name: "Identity and Access Management (IAM)",
    description: "Fine-grained access control and visibility for centrally managing cloud resources",
    icon: Icon.Key
  },
  {
    id: "compute",
    name: "Compute Engine",
    description: "Virtual machines running in Google's data centers",
    icon: Icon.Desktop
  },
  {
    id: "network",
    name: "VPC Network",
    description: "Virtual Private Cloud networks, subnets, and firewall rules",
    icon: Icon.Network
  },
  {
    id: "servicehub",
    name: "Marketplace",
    description: "Centralized service management and discovery platform",
    icon: Icon.Globe
  }
];

export default function ProjectView({ projectId, gcloudPath }: ProjectViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [projectDetails, setProjectDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();
  const [projects, setProjects] = useState<any[]>([]);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // If no projectId is provided, fetch all projects instead
  useEffect(() => {
    if (!projectId) {
      fetchProjects();
    }
  }, [projectId]);

  // Function to fetch all projects
  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading projects...",
        message: "Fetching your Google Cloud projects"
      });

      // Use the getProjects function which now has built-in caching
      const result = await getProjects(gcloudPath);
      
      loadingToast.hide();
      
      if (result && result.length > 0) {
        setProjects(result);
        // Cache the projects list
        CacheManager.saveProjectsList(result);
        
        showToast({
          style: Toast.Style.Success,
          title: "Projects loaded",
          message: `${result.length} projects found`
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "No projects found",
          message: "You don't have any Google Cloud projects"
        });
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setError("Failed to fetch projects");
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch projects",
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to select a project
  const selectProject = async (selectedProjectId: string) => {
    if (!selectedProjectId || typeof selectedProjectId !== 'string') {
      console.error("Invalid project ID provided to selectProject:", selectedProjectId);
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid project ID",
        message: "Cannot select project with invalid ID"
      });
      return;
    }
    
    setActionInProgress("selecting");
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Selecting project...",
        message: selectedProjectId
      });
      
      console.log("Saving selected project:", selectedProjectId);
      // Save to cache
      CacheManager.saveSelectedProject(selectedProjectId);
      
      loadingToast.hide();
      
      showToast({
        style: Toast.Style.Success,
        title: "Project selected",
        message: selectedProjectId
      });
      
      // Navigate to the project view with the selected project
      push(<ProjectView projectId={selectedProjectId} gcloudPath={gcloudPath} />);
    } catch (error) {
      console.error("Error selecting project:", error);
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to select project",
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Memoize the fetchProjectDetails function to avoid recreating it on each render
  const fetchProjectDetails = useCallback(async () => {
    // Skip if no projectId is provided
    if (!projectId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    // First try to get from cache
    const cachedDetailsStr = cache.get(`project-${projectId}`);
    const timestampStr = cache.get(`project-${projectId}-timestamp`);
    
    if (cachedDetailsStr && timestampStr) {
      const timestamp = parseInt(timestampStr, 10);
      
      // Check if cache is not expired
      if (Date.now() - timestamp <= 24 * 60 * 60 * 1000) { // 24 hours
        try {
          const cachedDetails = JSON.parse(cachedDetailsStr);
          setProjectDetails(cachedDetails);
          
          // Update the selected project in the global cache to ensure recently used list is updated
          CacheManager.saveSelectedProject(projectId);
          
          setIsLoading(false);
          return;
        } catch (error) {
          console.error("Error parsing cached project details:", error);
          // Continue to fetch from API
        }
      }
    }
    
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading project details...",
        message: projectId
      });
      
      const result = await executeGcloudCommand(
        gcloudPath, 
        `projects describe ${projectId}`
      );
      
      loadingToast.hide();
      
      if (result && result.length > 0) {
        setProjectDetails(result[0]);
        // Cache the result
        cache.set(`project-${projectId}`, JSON.stringify(result[0]));
        cache.set(`project-${projectId}-timestamp`, Date.now().toString());
        
        // Also update the selected project in the global cache
        CacheManager.saveSelectedProject(projectId);
        
        showToast({
          style: Toast.Style.Success,
          title: "Project details loaded",
          message: projectId
        });
      }
    } catch (error) {
      console.error("Error fetching project details:", error);
      setError("Failed to fetch project details");
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch project details",
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, gcloudPath]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  const viewStorageBuckets = async () => {
    setActionInProgress("storage");
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading Storage Buckets...",
        message: `Project: ${projectId}`
      });
      
      // Short delay to show the toast before navigation
      setTimeout(() => {
        loadingToast.hide();
        push(<StorageBucketView projectId={projectId} gcloudPath={gcloudPath} />);
      }, 500);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to navigate",
        message: error instanceof Error ? error.message : String(error)
      });
      setActionInProgress(null);
    }
  };

  const viewIAMPermissions = async () => {
    setActionInProgress("iam-permissions");
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading IAM Permissions...",
        message: `Project: ${projectId}`
      });
      
      // Short delay to show the toast before navigation
      setTimeout(() => {
        loadingToast.hide();
        push(<IAMMembersByPrincipalView projectId={projectId} gcloudPath={gcloudPath} />);
      }, 500);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to navigate",
        message: error instanceof Error ? error.message : String(error)
      });
      setActionInProgress(null);
    }
  };

  const viewIAMService = async () => {
    setActionInProgress("iam-service");
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading IAM Service...",
        message: `Project: ${projectId}`
      });
      
      // Short delay to show the toast before navigation
      setTimeout(() => {
        loadingToast.hide();
        push(<IAMView projectId={projectId} gcloudPath={gcloudPath} />);
      }, 500);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to navigate",
        message: error instanceof Error ? error.message : String(error)
      });
      setActionInProgress(null);
    }
  };

  const viewServiceHub = async () => {
    setActionInProgress("servicehub");
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading Marketplace...",
        message: `Project: ${projectId}`
      });
      
      // Short delay to show the toast before navigation
      setTimeout(() => {
        loadingToast.hide();
        push(<ServiceHubView projectId={projectId} gcloudPath={gcloudPath} />);
      }, 500);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to navigate",
        message: error instanceof Error ? error.message : String(error)
      });
      setActionInProgress(null);
    }
  };

  const viewComputeInstances = async () => {
    setActionInProgress("compute-instances");
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading Compute Instances...",
        message: `Project: ${projectId}`
      });
      
      // Short delay to show the toast before navigation
      setTimeout(() => {
        loadingToast.hide();
        push(<ComputeInstancesView projectId={projectId} gcloudPath={gcloudPath} />);
      }, 500);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to navigate",
        message: error instanceof Error ? error.message : String(error)
      });
      setActionInProgress(null);
    }
  };

  const viewComputeDisks = async () => {
    setActionInProgress("compute-disks");
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading Compute Disks...",
        message: `Project: ${projectId}`
      });
      
      // Short delay to show the toast before navigation
      setTimeout(() => {
        loadingToast.hide();
        push(<ComputeDisksView projectId={projectId} gcloudPath={gcloudPath} />);
      }, 500);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to navigate",
        message: error instanceof Error ? error.message : String(error)
      });
      setActionInProgress(null);
    }
  };

  const viewVPCNetworks = async () => {
    setActionInProgress("vpc-networks");
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading VPC Networks...",
        message: `Project: ${projectId}`
      });
      
      // Short delay to show the toast before navigation
      setTimeout(() => {
        loadingToast.hide();
        push(<VPCView projectId={projectId} gcloudPath={gcloudPath} />);
      }, 500);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to navigate",
        message: error instanceof Error ? error.message : String(error)
      });
      setActionInProgress(null);
    }
  };

  const viewNetworkService = async () => {
    setActionInProgress("network");
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading Network Service...",
        message: `Project: ${projectId}`
      });
      
      // Short delay to show the toast before navigation
      setTimeout(() => {
        loadingToast.hide();
        push(<NetworkView projectId={projectId} gcloudPath={gcloudPath} />);
      }, 500);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to navigate",
        message: error instanceof Error ? error.message : String(error)
      });
      setActionInProgress(null);
    }
  };

  const viewIPAddresses = async () => {
    setActionInProgress("ip-addresses");
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading IP Addresses...",
        message: `Project: ${projectId}`
      });
      
      // Short delay to show the toast before navigation
      setTimeout(() => {
        loadingToast.hide();
        push(<IPAddressView projectId={projectId} gcloudPath={gcloudPath} />);
      }, 500);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to navigate",
        message: error instanceof Error ? error.message : String(error)
      });
      setActionInProgress(null);
    }
  };

  const viewFirewallRules = async () => {
    setActionInProgress("firewall-rules");
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading Firewall Rules...",
        message: `Project: ${projectId}`
      });
      
      // Short delay to show the toast before navigation
      setTimeout(() => {
        loadingToast.hide();
        push(<FirewallRulesView projectId={projectId} gcloudPath={gcloudPath} />);
      }, 500);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to navigate",
        message: error instanceof Error ? error.message : String(error)
      });
      setActionInProgress(null);
    }
  };

  const clearCache = async () => {
    setActionInProgress("clearing-cache");
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Clearing cache...",
        message: projectId ? `Project: ${projectId}` : "All projects"
      });
      
      // Clear project-specific cache
      if (projectId) {
        cache.remove(`project-${projectId}`);
        cache.remove(`project-${projectId}-timestamp`);
      } else {
        // Clear all project caches
        CacheManager.clearProjectsListCache();
      }
      
      loadingToast.hide();
      
      showToast({
        style: Toast.Style.Success,
        title: "Cache cleared",
        message: "Project cache has been cleared"
      });
      
      // Refresh data
      if (projectId) {
        fetchProjectDetails();
      } else {
        fetchProjects();
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to clear cache",
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setActionInProgress(null);
    }
  };

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView 
          title={error} 
          description="An error occurred"
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action 
                title="Try Again" 
                icon={Icon.RotateClockwise} 
                onAction={projectId ? fetchProjectDetails : fetchProjects} 
              />
              <Action 
                title="Clear Cache" 
                icon={Icon.Trash} 
                onAction={clearCache} 
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List 
      isLoading={isLoading || actionInProgress !== null} 
      searchBarPlaceholder={projectId ? "Search services..." : "Search projects..."}
      navigationTitle={projectId ? `Project: ${projectId}` : "Google Cloud Projects"}
    >
      {projectId ? (
        <List.Section title="Project Services">
          {AVAILABLE_SERVICES.map((service) => (
            <List.Item
              id={service.id}
              key={service.id}
              title={service.name}
              subtitle={service.description}
              icon={service.icon}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {service.id === "storage" && (
                      <Action 
                        title="View Storage Buckets" 
                        icon={Icon.Box} 
                        onAction={viewStorageBuckets}
                      />
                    )}
                    {service.id === "iam" && (
                      <>
                        <Action 
                          title="View IAM Permissions" 
                          icon={Icon.Key} 
                          onAction={viewIAMService}
                        />
                        <Action 
                          title="View IAM by Principal" 
                          icon={Icon.Person} 
                          onAction={viewIAMPermissions}
                        />
                      </>
                    )}
                    {service.id === "servicehub" && (
                      <Action 
                        title="View Marketplace" 
                        icon={Icon.Globe} 
                        onAction={viewServiceHub}
                      />
                    )}
                    {service.id === "compute" && (
                      <>
                        <Action 
                          title="View Compute Instances" 
                          icon={Icon.Desktop} 
                          onAction={viewComputeInstances}
                        />
                        <Action 
                          title="View Compute Disks" 
                          icon={Icon.HardDrive} 
                          onAction={viewComputeDisks}
                        />
                      </>
                    )}
                    {service.id === "network" && (
                      <>
                        <Action 
                          title="Network Dashboard" 
                          icon={Icon.AppWindow} 
                          onAction={viewNetworkService}
                        />
                        <Action 
                          title="View VPC Networks" 
                          icon={Icon.Globe} 
                          onAction={viewVPCNetworks}
                        />
                        <Action 
                          title="View IP Addresses" 
                          icon={Icon.Link} 
                          onAction={viewIPAddresses}
                        />
                        <Action 
                          title="View Firewall Rules" 
                          icon={Icon.Shield} 
                          onAction={viewFirewallRules}
                        />
                      </>
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action 
                      title="Refresh Project Details" 
                      icon={Icon.RotateClockwise} 
                      onAction={fetchProjectDetails}
                    />
                    <Action 
                      title="Clear Cache" 
                      icon={Icon.Trash} 
                      onAction={clearCache}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.Section title="Google Cloud Projects" subtitle={`${projects.length} projects`}>
          {projects.map((project) => (
            <List.Item
              key={project.id}
              title={project.name || project.id}
              subtitle={project.id}
              icon={{ source: Icon.Document, tintColor: Color.Blue }}
              accessories={[
                { 
                  text: project.createTime ? new Date(project.createTime).toLocaleDateString() : "", 
                  icon: Icon.Calendar 
                }
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Project"
                    icon={Icon.Forward}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => {
                      console.log("Selecting project:", project.id, project);
                      selectProject(project.id);
                    }}
                  />
                  <Action
                    title="Refresh Projects"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={fetchProjects}
                  />
                  <Action
                    title="Clear Cache"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={clearCache}
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