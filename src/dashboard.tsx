import { useEffect, useState, useCallback } from "react";
import {
  List,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
  Color,
  ActionPanel,
  Action,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  countWorkflows,
  listNamespaces,
  showConnectionError,
  setCurrentNamespace,
} from "./lib/temporal-client";
import { Preferences, NamespaceInfo } from "./lib/types";
import { getSelectedNamespace, setSelectedNamespace } from "./lib/storage";

interface WorkflowCounts {
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  terminated: number;
  timedOut: number;
  continuedAsNew: number;
}

const TIME_RANGES = [
  { value: "1h", title: "Last Hour" },
  { value: "24h", title: "Last 24 Hours" },
  { value: "7d", title: "Last 7 Days" },
  { value: "30d", title: "Last 30 Days" },
  { value: "all", title: "All Time" },
];

/**
 * Get the time query for a given time range
 * Temporal HTTP API requires actual ISO timestamps, not "now() - 1h" syntax
 */
function getTimeQuery(range: string): string {
  if (range === "all") return "";

  const now = new Date();
  let startTime: Date;

  switch (range) {
    case "1h":
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case "24h":
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      return "";
  }

  return `StartTime > "${startTime.toISOString()}"`;
}

export default function Dashboard() {
  const [selectedNamespace, setSelectedNamespaceState] = useState<string>("");
  const [timeRange, setTimeRange] = useState("24h");
  const prefs = getPreferenceValues<Preferences>();

  // Fetch namespaces
  const { data: namespaces, isLoading: namespacesLoading } = useCachedPromise(
    async () => {
      try {
        return await listNamespaces();
      } catch {
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

  const timeRangeConfig = TIME_RANGES.find((t) => t.value === timeRange) || TIME_RANGES[1];

  // Fetch workflow counts
  const {
    data: counts,
    isLoading: countsLoading,
    revalidate,
  } = useCachedPromise(
    async (namespace: string, range: string) => {
      if (!namespace) return null;

      // Compute the time query with actual ISO timestamp
      const timeQuery = getTimeQuery(range);

      const buildQuery = (status: string) => {
        const statusQuery = `ExecutionStatus = "${status}"`;
        return timeQuery ? `${statusQuery} AND ${timeQuery}` : statusQuery;
      };

      const [running, completed, failed, cancelled, terminated, timedOut, continuedAsNew] =
        await Promise.all([
          countWorkflows(buildQuery("Running")).catch(() => 0),
          countWorkflows(buildQuery("Completed")).catch(() => 0),
          countWorkflows(buildQuery("Failed")).catch(() => 0),
          countWorkflows(buildQuery("Canceled")).catch(() => 0),
          countWorkflows(buildQuery("Terminated")).catch(() => 0),
          countWorkflows(buildQuery("TimedOut")).catch(() => 0),
          countWorkflows(buildQuery("ContinuedAsNew")).catch(() => 0),
        ]);

      return {
        running,
        completed,
        failed,
        cancelled,
        terminated,
        timedOut,
        continuedAsNew,
      } as WorkflowCounts;
    },
    [selectedNamespace, timeRange],
    {
      keepPreviousData: true,
      onError: showConnectionError,
    }
  );

  // Periodic refresh (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      revalidate();
    }, 30000);
    return () => clearInterval(interval);
  }, [revalidate]);

  const isLoading = countsLoading || namespacesLoading || !selectedNamespace;
  const total = counts
    ? counts.running +
      counts.completed +
      counts.failed +
      counts.cancelled +
      counts.terminated +
      counts.timedOut +
      counts.continuedAsNew
    : 0;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Dashboard"
      searchBarAccessory={
        <DashboardDropdown
          namespaces={namespaces || []}
          selectedNamespace={selectedNamespace}
          timeRange={timeRange}
          onNamespaceChange={handleNamespaceChange}
          onTimeRangeChange={setTimeRange}
        />
      }
    >
      <List.Section
        title="Overview"
        subtitle={`${total} total workflows - ${timeRangeConfig.title}`}
      >
        <StatusItem
          title="Running"
          count={counts?.running || 0}
          icon={Icon.Play}
          color={Color.Blue}
          onRefresh={revalidate}
        />
        <StatusItem
          title="Completed"
          count={counts?.completed || 0}
          icon={Icon.CheckCircle}
          color={Color.Green}
          onRefresh={revalidate}
        />
        <StatusItem
          title="Failed"
          count={counts?.failed || 0}
          icon={Icon.XMarkCircle}
          color={Color.Red}
          onRefresh={revalidate}
        />
        <StatusItem
          title="Cancelled"
          count={counts?.cancelled || 0}
          icon={Icon.Stop}
          color={Color.Orange}
          onRefresh={revalidate}
        />
        <StatusItem
          title="Terminated"
          count={counts?.terminated || 0}
          icon={Icon.Trash}
          color={Color.Magenta}
          onRefresh={revalidate}
        />
        <StatusItem
          title="Timed Out"
          count={counts?.timedOut || 0}
          icon={Icon.Clock}
          color={Color.Yellow}
          onRefresh={revalidate}
        />
        <StatusItem
          title="Continued As New"
          count={counts?.continuedAsNew || 0}
          icon={Icon.ArrowRight}
          color={Color.Purple}
          onRefresh={revalidate}
        />
      </List.Section>

      <List.Section title="Quick Stats">
        <List.Item
          title="Success Rate"
          icon={Icon.BarChart}
          accessories={[
            {
              text: calculateSuccessRate(counts),
              tooltip: "Percentage of completed workflows out of finished workflows",
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Active Workflows"
          icon={Icon.Bolt}
          accessories={[
            {
              text: String(counts?.running || 0),
              tooltip: "Currently running workflows",
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Failure Count"
          icon={Icon.ExclamationMark}
          accessories={[
            {
              text: String((counts?.failed || 0) + (counts?.timedOut || 0)),
              tooltip: "Failed + Timed Out workflows",
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// ============================================================================
// Components
// ============================================================================

interface DashboardDropdownProps {
  namespaces: NamespaceInfo[];
  selectedNamespace: string;
  timeRange: string;
  onNamespaceChange: (namespace: string) => void;
  onTimeRangeChange: (range: string) => void;
}

function DashboardDropdown({
  namespaces,
  selectedNamespace,
  timeRange,
  onNamespaceChange,
  onTimeRangeChange,
}: DashboardDropdownProps) {
  const combinedValue = `${selectedNamespace}:${timeRange}`;

  const handleChange = (value: string) => {
    const [ns, range] = value.split(":");
    if (ns !== selectedNamespace) {
      onNamespaceChange(ns);
    }
    if (range !== timeRange) {
      onTimeRangeChange(range);
    }
  };

  return (
    <List.Dropdown tooltip="Namespace & Time Range" value={combinedValue} onChange={handleChange}>
      {namespaces.map((ns) => (
        <List.Dropdown.Section key={ns.name} title={ns.name}>
          {TIME_RANGES.map((range) => (
            <List.Dropdown.Item
              key={`${ns.name}:${range.value}`}
              title={range.title}
              value={`${ns.name}:${range.value}`}
              icon={
                ns.name === selectedNamespace && range.value === timeRange
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

interface StatusItemProps {
  title: string;
  count: number;
  icon: Icon;
  color: Color;
  onRefresh: () => void;
}

function StatusItem({ title, count, icon, color, onRefresh }: StatusItemProps) {
  return (
    <List.Item
      title={title}
      icon={{ source: icon, tintColor: color }}
      accessories={[{ tag: { value: String(count), color } }]}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}

// ============================================================================
// Helpers
// ============================================================================

function calculateSuccessRate(counts: WorkflowCounts | null | undefined): string {
  if (!counts) return "N/A";

  const finished =
    counts.completed + counts.failed + counts.cancelled + counts.terminated + counts.timedOut;
  if (finished === 0) return "N/A";

  const rate = (counts.completed / finished) * 100;
  return `${rate.toFixed(1)}%`;
}
