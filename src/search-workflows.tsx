import { useEffect, useState, useCallback } from "react";
import { List, Icon, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  listWorkflows,
  listNamespaces,
  showConnectionError,
  setCurrentNamespace,
} from "./lib/temporal-client";
import { Preferences, WorkflowInfo, NamespaceInfo } from "./lib/types";
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
  const [selectedNamespace, setSelectedNamespaceState] = useState<string>("");
  const [recentWorkflows, setRecentWorkflows] = useState<RecentWorkflow[]>([]);
  const prefs = getPreferenceValues<Preferences>();

  // Fetch namespaces
  const { data: namespaces, isLoading: namespacesLoading } = useCachedPromise(
    async () => {
      try {
        return await listNamespaces();
      } catch {
        // If we can't list namespaces, return just the default one
        return [{ name: prefs.namespace, state: "Registered" }] as NamespaceInfo[];
      }
    },
    [],
    { keepPreviousData: true }
  );

  // Initialize namespace from storage or preferences
  useEffect(() => {
    async function initNamespace() {
      const stored = await getSelectedNamespace();
      const ns = stored || prefs.namespace;
      setSelectedNamespaceState(ns);
      setCurrentNamespace(ns);
    }
    initNamespace();
  }, [prefs.namespace]);

  // Load recent workflows
  useEffect(() => {
    async function loadRecents() {
      const recents = await getRecentWorkflows();
      // Filter to only show recents from current namespace
      const filtered = recents.filter((r) => r.namespace === selectedNamespace);
      setRecentWorkflows(filtered);
    }
    if (selectedNamespace) {
      loadRecents();
    }
  }, [selectedNamespace]);

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
      await addRecentWorkflow(workflow, selectedNamespace);
      // Refresh recents list
      const recents = await getRecentWorkflows();
      const filtered = recents.filter((r) => r.namespace === selectedNamespace);
      setRecentWorkflows(filtered);
    },
    [selectedNamespace]
  );

  const isLoading = workflowsLoading || namespacesLoading || !selectedNamespace;

  // Show recent workflows when search is empty and no status filter
  const showRecents = !searchText && statusFilter === "all" && recentWorkflows.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by workflow ID or type..."
      searchBarAccessory={
        <NamespaceDropdown
          namespaces={namespaces || []}
          selectedNamespace={selectedNamespace}
          statusFilter={statusFilter}
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
          description={`Could not connect to Temporal at ${prefs.temporalUiUrl}. Please check your settings.`}
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
            title={statusFilter !== "all" ? `${getStatusFilterLabel(statusFilter)} Workflows` : "Workflows"}
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

interface NamespaceDropdownProps {
  namespaces: NamespaceInfo[];
  selectedNamespace: string;
  statusFilter: string;
  onNamespaceChange: (namespace: string) => void;
  onStatusChange: (status: string) => void;
}

function NamespaceDropdown({
  namespaces,
  selectedNamespace,
  statusFilter,
  onNamespaceChange,
  onStatusChange,
}: NamespaceDropdownProps) {
  // Combined dropdown value: "namespace:status"
  const combinedValue = `${selectedNamespace}:${statusFilter}`;

  const handleChange = (value: string) => {
    const [ns, status] = value.split(":");
    if (ns !== selectedNamespace) {
      onNamespaceChange(ns);
    }
    if (status !== statusFilter) {
      onStatusChange(status);
    }
  };

  return (
    <List.Dropdown tooltip="Namespace & Status" value={combinedValue} onChange={handleChange}>
      {namespaces.map((ns) => (
        <List.Dropdown.Section key={ns.name} title={ns.name}>
          {STATUS_FILTERS.map((filter) => (
            <List.Dropdown.Item
              key={`${ns.name}:${filter.value}`}
              title={filter.title}
              value={`${ns.name}:${filter.value}`}
              icon={
                ns.name === selectedNamespace && filter.value === statusFilter
                  ? Icon.CheckCircle
                  : undefined
              }
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
