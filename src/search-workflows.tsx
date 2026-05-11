import { useEffect, useState, useCallback } from "react";
import { List, Icon, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  listWorkflows,
  listNamespaces,
  showConnectionError,
  setCurrentNamespace,
  setCurrentCluster,
  getClusters,
  getCurrentCluster,
} from "./lib/temporal-client";
import { WorkflowInfo, NamespaceInfo, ClusterConfig } from "./lib/types";
import {
  buildSearchQuery,
  formatRelativeTime,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
  getWorkflowDuration,
  truncate,
} from "./lib/utils";
import {
  getRecentWorkflows,
  addRecentWorkflow,
  getSelectedNamespace,
  setSelectedNamespace,
  getSelectedCluster,
  setSelectedCluster,
  RecentWorkflow,
} from "./lib/storage";
import WorkflowActions from "./components/workflow-actions";

const STATUS_FILTERS: { value: string; title: string }[] = [
  { value: "all", title: "All Statuses" },
  { value: "Running", title: "Running" },
  { value: "Completed", title: "Completed" },
  { value: "Failed", title: "Failed" },
  { value: "Cancelled", title: "Cancelled" },
  { value: "Terminated", title: "Terminated" },
  { value: "TimedOut", title: "Timed Out" },
];

export default function SearchWorkflows() {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClusterName, setSelectedClusterName] = useState<string>("");
  const [selectedNamespace, setSelectedNamespaceState] = useState<string>("");
  const [recentWorkflows, setRecentWorkflows] = useState<RecentWorkflow[]>([]);

  // Get clusters from preferences
  const clusters = getClusters();

  // Initialize cluster and namespace from storage
  useEffect(() => {
    async function init() {
      // Get stored cluster or use first one
      const storedCluster = await getSelectedCluster();
      const clusterName =
        storedCluster && clusters.find((c) => c.name === storedCluster)
          ? storedCluster
          : clusters[0]?.name || "Local";

      const cluster = clusters.find((c) => c.name === clusterName) || clusters[0];
      setSelectedClusterName(clusterName);
      setCurrentCluster(cluster);

      // Get stored namespace or use cluster default
      const storedNamespace = await getSelectedNamespace();
      const ns = storedNamespace || cluster?.namespace || "default";
      setSelectedNamespaceState(ns);
      setCurrentNamespace(ns);
    }
    init();
  }, []);

  // Fetch namespaces for selected cluster
  const {
    data: namespaces,
    isLoading: namespacesLoading,
    revalidate: revalidateNamespaces,
  } = useCachedPromise(
    async (clusterName: string) => {
      if (!clusterName) return [];
      try {
        return await listNamespaces();
      } catch {
        // If we can't list namespaces, return just the cluster default
        const cluster = clusters.find((c) => c.name === clusterName);
        return [{ name: cluster?.namespace || "default", state: "Registered" }] as NamespaceInfo[];
      }
    },
    [selectedClusterName],
    { keepPreviousData: true }
  );

  // Load recent workflows for current cluster and namespace
  useEffect(() => {
    async function loadRecents() {
      const recents = await getRecentWorkflows();
      // Filter to only show recents from current cluster and namespace
      const filtered = recents.filter(
        (r) => r.cluster === selectedClusterName && r.namespace === selectedNamespace
      );
      setRecentWorkflows(filtered);
    }
    if (selectedClusterName && selectedNamespace) {
      loadRecents();
    }
  }, [selectedClusterName, selectedNamespace]);

  // Handle cluster change
  const handleClusterChange = useCallback(
    async (clusterName: string) => {
      const cluster = clusters.find((c) => c.name === clusterName);
      if (!cluster) return;

      setSelectedClusterName(clusterName);
      setCurrentCluster(cluster);
      await setSelectedCluster(clusterName);

      // Reset namespace to cluster default
      const ns = cluster.namespace || "default";
      setSelectedNamespaceState(ns);
      setCurrentNamespace(ns);
      await setSelectedNamespace(ns);

      // Refresh namespaces for new cluster
      revalidateNamespaces();

      await showToast({
        style: Toast.Style.Success,
        title: "Cluster Changed",
        message: `${clusterName} / ${ns}`,
      });
    },
    [clusters, revalidateNamespaces]
  );

  // Handle namespace change
  const handleNamespaceChange = useCallback(async (namespace: string) => {
    setSelectedNamespaceState(namespace);
    setCurrentNamespace(namespace);
    await setSelectedNamespace(namespace);
    await showToast({
      style: Toast.Style.Success,
      title: "Namespace Changed",
      message: namespace,
    });
  }, []);

  // Fetch workflows
  const {
    data: workflows,
    isLoading: workflowsLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (query: string, status: string, namespace: string) => {
      if (!namespace) return [];
      const searchQuery = buildSearchQuery(query, status);
      return listWorkflows(searchQuery, namespace);
    },
    [searchText, statusFilter, selectedNamespace],
    {
      keepPreviousData: true,
      onError: showConnectionError,
    }
  );

  // Periodic refresh (every 30 seconds when the command is open)
  useEffect(() => {
    const interval = setInterval(() => {
      revalidate();
    }, 30000);

    return () => clearInterval(interval);
  }, [revalidate]);

  // Track workflow views for recents
  const handleWorkflowView = useCallback(
    async (workflow: WorkflowInfo) => {
      await addRecentWorkflow(workflow, selectedNamespace, selectedClusterName);
      // Refresh recents list
      const recents = await getRecentWorkflows();
      const filtered = recents.filter(
        (r) => r.cluster === selectedClusterName && r.namespace === selectedNamespace
      );
      setRecentWorkflows(filtered);
    },
    [selectedNamespace, selectedClusterName]
  );

  const isLoading =
    workflowsLoading || namespacesLoading || !selectedNamespace || !selectedClusterName;

  // Show recent workflows when search is empty and no status filter
  const showRecents = !searchText && statusFilter === "all" && recentWorkflows.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by workflow ID or type..."
      searchBarAccessory={
        <CombinedDropdown
          clusters={clusters}
          selectedCluster={selectedClusterName}
          namespaces={namespaces || []}
          selectedNamespace={selectedNamespace}
          statusFilter={statusFilter}
          onClusterChange={handleClusterChange}
          onNamespaceChange={handleNamespaceChange}
          onStatusChange={setStatusFilter}
        />
      }
      throttle
    >
      {error && !workflows ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Connection Error"
          description={`Could not connect to Temporal at ${getCurrentCluster().url}. Please check your settings.`}
        />
      ) : !isLoading && workflows?.length === 0 && !showRecents ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Workflows Found"
          description={
            searchText || statusFilter !== "all"
              ? "Try adjusting your search or filter"
              : "No workflows in this namespace"
          }
        />
      ) : (
        <>
          {/* Recent Workflows Section */}
          {showRecents && (
            <List.Section title="Recent" subtitle={String(recentWorkflows.length)}>
              {recentWorkflows.map((recent) => (
                <RecentWorkflowItem
                  key={`${recent.workflowId}-${recent.runId}`}
                  recent={recent}
                  onRefresh={revalidate}
                  onView={handleWorkflowView}
                />
              ))}
            </List.Section>
          )}

          {/* All Workflows - chronologically sorted (newest first) */}
          <List.Section
            title={
              statusFilter !== "all"
                ? `${getStatusFilterLabel(statusFilter)} Workflows`
                : "Workflows"
            }
            subtitle={String(workflows?.length || 0)}
          >
            {workflows?.map((workflow) => (
              <WorkflowListItem
                key={`${workflow.workflowId}-${workflow.runId}`}
                workflow={workflow}
                onRefresh={revalidate}
                onView={handleWorkflowView}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

// ============================================================================
// Components
// ============================================================================

interface CombinedDropdownProps {
  clusters: ClusterConfig[];
  selectedCluster: string;
  namespaces: NamespaceInfo[];
  selectedNamespace: string;
  statusFilter: string;
  onClusterChange: (clusterName: string) => void;
  onNamespaceChange: (namespace: string) => void;
  onStatusChange: (status: string) => void;
}

function CombinedDropdown({
  clusters,
  selectedCluster,
  namespaces,
  selectedNamespace,
  statusFilter,
  onClusterChange,
  onNamespaceChange,
  onStatusChange,
}: CombinedDropdownProps) {
  // Combined dropdown value: "cluster|namespace|status"
  const combinedValue = `${selectedCluster}|${selectedNamespace}|${statusFilter}`;

  const handleChange = (value: string) => {
    const [cluster, ns, status] = value.split("|");
    if (cluster !== selectedCluster) {
      onClusterChange(cluster);
      // Don't process namespace/status changes - cluster change resets them
      return;
    }
    if (ns !== selectedNamespace) {
      onNamespaceChange(ns);
    }
    if (status !== statusFilter) {
      onStatusChange(status);
    }
  };

  // Show clusters as top-level sections if multiple clusters
  const hasMultipleClusters = clusters.length > 1;

  if (hasMultipleClusters) {
    return (
      <List.Dropdown
        tooltip="Cluster / Namespace / Status"
        value={combinedValue}
        onChange={handleChange}
      >
        {clusters.map((cluster) => (
          <List.Dropdown.Section key={cluster.name} title={`📍 ${cluster.name}`}>
            {cluster.name === selectedCluster ? (
              // Show namespaces and statuses for selected cluster
              namespaces.map((ns) => (
                <List.Dropdown.Section key={`${cluster.name}-${ns.name}`} title={`  ${ns.name}`}>
                  {STATUS_FILTERS.map((filter) => (
                    <List.Dropdown.Item
                      key={`${cluster.name}|${ns.name}|${filter.value}`}
                      title={`    ${filter.title}`}
                      value={`${cluster.name}|${ns.name}|${filter.value}`}
                    />
                  ))}
                </List.Dropdown.Section>
              ))
            ) : (
              // Just show a switch option for other clusters
              <List.Dropdown.Item
                key={`${cluster.name}|switch`}
                title="  Switch to this cluster..."
                value={`${cluster.name}|${cluster.namespace || "default"}|all`}
              />
            )}
          </List.Dropdown.Section>
        ))}
      </List.Dropdown>
    );
  }

  // Single cluster - simpler dropdown with just namespace/status
  return (
    <List.Dropdown tooltip="Namespace & Status" value={combinedValue} onChange={handleChange}>
      {namespaces.map((ns) => (
        <List.Dropdown.Section key={ns.name} title={ns.name}>
          {STATUS_FILTERS.map((filter) => (
            <List.Dropdown.Item
              key={`${selectedCluster}|${ns.name}|${filter.value}`}
              title={filter.title}
              value={`${selectedCluster}|${ns.name}|${filter.value}`}
            />
          ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
}

interface WorkflowListItemProps {
  workflow: WorkflowInfo;
  onRefresh: () => void;
  onView: (workflow: WorkflowInfo) => void;
}

function WorkflowListItem({ workflow, onRefresh, onView }: WorkflowListItemProps) {
  const statusIcon = getStatusIcon(workflow.status);
  const statusColor = getStatusColor(workflow.status);
  const statusLabel = getStatusLabel(workflow.status);
  const duration = getWorkflowDuration(workflow);
  const startedAgo = formatRelativeTime(workflow.startTime);

  return (
    <List.Item
      title={workflow.type}
      subtitle={truncate(workflow.workflowId, 40)}
      icon={{ source: statusIcon, tintColor: statusColor }}
      accessories={[
        { text: duration, tooltip: `Duration: ${duration}` },
        { text: startedAgo, tooltip: `Started: ${workflow.startTime.toLocaleString()}` },
        { tag: { value: statusLabel, color: statusColor } },
      ]}
      actions={
        <WorkflowActions
          workflow={workflow}
          onRefresh={onRefresh}
          onView={() => onView(workflow)}
        />
      }
    />
  );
}

interface RecentWorkflowItemProps {
  recent: RecentWorkflow;
  onRefresh: () => void;
  onView: (workflow: WorkflowInfo) => void;
}

function RecentWorkflowItem({ recent, onRefresh, onView }: RecentWorkflowItemProps) {
  const viewedAgo = formatRelativeTime(new Date(recent.viewedAt));

  return (
    <List.Item
      title={recent.type}
      subtitle={truncate(recent.workflowId, 40)}
      icon={Icon.Clock}
      accessories={[
        {
          text: `Viewed ${viewedAgo}`,
          tooltip: `Last viewed: ${new Date(recent.viewedAt).toLocaleString()}`,
        },
      ]}
      actions={
        <WorkflowActions
          workflow={{
            workflowId: recent.workflowId,
            runId: recent.runId,
            type: recent.type,
            status: "UNKNOWN",
            startTime: new Date(),
            taskQueue: "unknown",
          }}
          onRefresh={onRefresh}
          onView={(wf) => onView(wf)}
        />
      }
    />
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getStatusFilterLabel(filter: string): string {
  const found = STATUS_FILTERS.find((f) => f.value === filter);
  return found?.title || filter;
}
