import { showToast, Toast } from "@raycast/api";
import {
  ClusterConfig,
  HistoryEvent,
  NamespaceInfo,
  ScheduleInfo,
  WorkflowInfo,
  WorkflowStatus,
} from "./types";
import { getClustersFromStorage } from "./storage";

// Current cluster override (set by cluster switcher)
let currentClusterOverride: ClusterConfig | null = null;

// Current namespace override (set by namespace switcher)
let currentNamespaceOverride: string | null = null;

// Cached clusters (loaded once per session)
let cachedClusters: ClusterConfig[] | null = null;

/**
 * Get all configured clusters
 * Uses cache to avoid repeated LocalStorage reads
 */
export async function getClusters(): Promise<ClusterConfig[]> {
  if (cachedClusters) {
    return cachedClusters;
  }
  cachedClusters = await getClustersFromStorage();
  return cachedClusters;
}

/**
 * Invalidate clusters cache (call after add/edit/delete)
 */
export function invalidateClustersCache(): void {
  cachedClusters = null;
}

/**
 * Set the current cluster (overrides default)
 */
export function setCurrentCluster(cluster: ClusterConfig | null): void {
  currentClusterOverride = cluster;
  // Reset namespace override when cluster changes
  currentNamespaceOverride = null;
}

/**
 * Get the current cluster (sync version using cache/override)
 */
export function getCurrentCluster(): ClusterConfig {
  if (currentClusterOverride) {
    return currentClusterOverride;
  }
  // Use cached clusters if available
  if (cachedClusters && cachedClusters.length > 0) {
    return cachedClusters[0];
  }
  // Fallback default
  return { name: "Local", url: "http://localhost:8080", namespace: "default" };
}

/**
 * Set the current namespace (overrides cluster default)
 */
export function setCurrentNamespace(namespace: string | null): void {
  currentNamespaceOverride = namespace;
}

/**
 * Get the current namespace (from override or cluster default)
 */
export function getCurrentNamespace(): string {
  if (currentNamespaceOverride) {
    return currentNamespaceOverride;
  }
  const cluster = getCurrentCluster();
  return cluster.namespace || "default";
}

/**
 * Build the base URL for the Temporal HTTP API
 * Uses the Temporal UI URL since it proxies API requests
 */
function getBaseUrl(): string {
  const cluster = getCurrentCluster();
  // The Temporal UI service proxies API requests, so we use the UI URL
  // This works for both Docker setups (port 8080) and dev server (port 8233)
  return cluster.url.replace(/\/$/, ""); // Remove trailing slash if present
}

/**
 * Get headers for API requests
 */
function getHeaders(): HeadersInit {
  const cluster = getCurrentCluster();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (cluster.apiKey) {
    headers["Authorization"] = `Bearer ${cluster.apiKey}`;
  }

  return headers;
}

/**
 * Make an API request to Temporal
 */
async function apiRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;
  const headers = getHeaders();

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error || errorMessage;
    } catch {
      if (errorText) {
        errorMessage = errorText;
      }
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

/**
 * Map Temporal API status to our WorkflowStatus type
 */
function mapStatus(status: string): WorkflowStatus {
  // API returns statuses like "WORKFLOW_EXECUTION_STATUS_RUNNING"
  const normalizedStatus = status
    .replace("WORKFLOW_EXECUTION_STATUS_", "")
    .replace("Running", "RUNNING")
    .replace("Completed", "COMPLETED")
    .replace("Failed", "FAILED")
    .replace("Canceled", "CANCELLED")
    .replace("Cancelled", "CANCELLED")
    .replace("Terminated", "TERMINATED")
    .replace("TimedOut", "TIMED_OUT")
    .replace("ContinuedAsNew", "CONTINUED_AS_NEW")
    .toUpperCase();

  switch (normalizedStatus) {
    case "RUNNING":
      return "RUNNING";
    case "COMPLETED":
      return "COMPLETED";
    case "FAILED":
      return "FAILED";
    case "CANCELLED":
    case "CANCELED":
      return "CANCELLED";
    case "TERMINATED":
      return "TERMINATED";
    case "TIMED_OUT":
    case "TIMEDOUT":
      return "TIMED_OUT";
    case "CONTINUED_AS_NEW":
    case "CONTINUEDASNEW":
      return "CONTINUED_AS_NEW";
    default:
      return "UNKNOWN";
  }
}

/**
 * Parse a Temporal timestamp to a Date
 */
function parseTimestamp(
  timestamp: string | { seconds?: string; nanos?: number } | undefined
): Date | undefined {
  if (!timestamp) return undefined;

  if (typeof timestamp === "string") {
    return new Date(timestamp);
  }

  if (timestamp.seconds) {
    const seconds = parseInt(timestamp.seconds, 10);
    const nanos = timestamp.nanos || 0;
    return new Date(seconds * 1000 + nanos / 1000000);
  }

  return undefined;
}

// API Response Types
interface WorkflowExecutionInfo {
  execution?: {
    workflowId?: string;
    runId?: string;
  };
  type?: {
    name?: string;
  };
  status?: string;
  startTime?: string | { seconds?: string; nanos?: number };
  closeTime?: string | { seconds?: string; nanos?: number };
  taskQueue?: string;
  historyLength?: string;
  memo?: Record<string, unknown>;
  searchAttributes?: {
    indexedFields?: Record<string, unknown>;
  };
  parentExecution?: {
    workflowId?: string;
    runId?: string;
  };
}

interface ListWorkflowsResponse {
  executions?: WorkflowExecutionInfo[];
  nextPageToken?: string;
}

interface DescribeWorkflowResponse {
  workflowExecutionInfo?: WorkflowExecutionInfo;
  executionConfig?: Record<string, unknown>;
  pendingActivities?: unknown[];
  pendingChildren?: unknown[];
}

// Temporal payload structure
interface TemporalPayload {
  metadata?: { encoding?: string; type?: string };
  data?: string;
}

/**
 * Decode a single Temporal payload from base64
 */
function decodePayload(payload: TemporalPayload | unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;

  const p = payload as TemporalPayload;
  if (!p.data) return payload;

  try {
    const decoded = Buffer.from(p.data, "base64").toString("utf-8");
    // Try to parse as JSON
    try {
      return JSON.parse(decoded);
    } catch {
      return decoded; // Return as string if not valid JSON
    }
  } catch {
    return payload; // Return raw if decoding fails
  }
}

/**
 * Decode all search attributes from Temporal payload format
 */
function decodeSearchAttributes(
  indexedFields?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!indexedFields) return undefined;

  const decoded: Record<string, unknown> = {};
  for (const [key, payload] of Object.entries(indexedFields)) {
    decoded[key] = decodePayload(payload);
  }
  return decoded;
}

/**
 * Decode memo fields from Temporal payload format
 */
function decodeMemo(memo?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!memo) return undefined;

  const decoded: Record<string, unknown> = {};
  for (const [key, payload] of Object.entries(memo)) {
    decoded[key] = decodePayload(payload);
  }
  return decoded;
}

/**
 * Convert API workflow info to our WorkflowInfo type
 */
function mapWorkflowInfo(info: WorkflowExecutionInfo): WorkflowInfo {
  return {
    workflowId: info.execution?.workflowId || "unknown",
    runId: info.execution?.runId || "unknown",
    type: info.type?.name || "unknown",
    status: mapStatus(info.status || "UNKNOWN"),
    startTime: parseTimestamp(info.startTime) || new Date(),
    closeTime: parseTimestamp(info.closeTime),
    taskQueue: info.taskQueue || "unknown",
    historyLength: info.historyLength ? parseInt(info.historyLength, 10) : undefined,
    memo: decodeMemo(info.memo),
    searchAttributes: decodeSearchAttributes(info.searchAttributes?.indexedFields),
    parentWorkflowId: info.parentExecution?.workflowId,
    parentRunId: info.parentExecution?.runId,
  };
}

/**
 * List workflows with optional query filter
 */
export async function listWorkflows(
  query?: string,
  namespaceOverride?: string
): Promise<WorkflowInfo[]> {
  const namespace = namespaceOverride || getCurrentNamespace();

  let path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/workflows`;
  const params = new URLSearchParams();

  if (query) {
    params.set("query", query);
  }
  params.set("pageSize", "100");

  if (params.toString()) {
    path += `?${params.toString()}`;
  }

  const response = await apiRequest<ListWorkflowsResponse>("GET", path);

  if (!response.executions) {
    return [];
  }

  // Return in API order - Temporal returns newest first by default
  // Client-side sorting removed as it may conflict with API's natural order
  return response.executions.map(mapWorkflowInfo);
}

/**
 * Get detailed information about a specific workflow
 */
export async function getWorkflowDetails(
  workflowId: string,
  runId?: string,
  namespaceOverride?: string
): Promise<WorkflowInfo> {
  const namespace = namespaceOverride || getCurrentNamespace();

  let path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/workflows/${encodeURIComponent(workflowId)}`;

  if (runId) {
    path += `?runId=${encodeURIComponent(runId)}`;
  }

  const response = await apiRequest<DescribeWorkflowResponse>("GET", path);

  if (!response.workflowExecutionInfo) {
    throw new Error("Workflow not found");
  }

  return mapWorkflowInfo(response.workflowExecutionInfo);
}

/**
 * Cancel a workflow (graceful cancellation)
 */
export async function cancelWorkflow(workflowId: string, runId?: string): Promise<void> {
  const namespace = getCurrentNamespace();

  const path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/workflows/${encodeURIComponent(workflowId)}/cancel`;

  const body: Record<string, unknown> = {};
  if (runId) {
    body.runId = runId;
  }

  await apiRequest<Record<string, unknown>>("POST", path, body);
}

/**
 * Terminate a workflow (immediate termination)
 */
export async function terminateWorkflow(
  workflowId: string,
  reason: string,
  runId?: string
): Promise<void> {
  const namespace = getCurrentNamespace();

  const path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/workflows/${encodeURIComponent(workflowId)}/terminate`;

  const body: Record<string, unknown> = {
    reason,
  };
  if (runId) {
    body.runId = runId;
  }

  await apiRequest<Record<string, unknown>>("POST", path, body);
}

/**
 * Test the connection to Temporal
 */
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    // Try to list workflows as a connection test
    await listWorkflows();
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

/**
 * Show an error toast with connection troubleshooting info
 */
export async function showConnectionError(error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);

  let title = "Connection Failed";
  let toastMessage = message;

  if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
    title = "Cannot Connect to Temporal";
    toastMessage = "Make sure Temporal server is running";
  } else if (
    message.includes("certificate") ||
    message.includes("TLS") ||
    message.includes("SSL")
  ) {
    title = "TLS/Certificate Error";
    toastMessage = "Check your certificate configuration";
  } else if (
    message.includes("401") ||
    message.includes("unauthorized") ||
    message.includes("Unauthorized")
  ) {
    title = "Authentication Failed";
    toastMessage = "Check your API key or credentials";
  } else if (message.includes("404")) {
    title = "Not Found";
    toastMessage = "Check your namespace and server address";
  } else if (message.includes("namespace")) {
    title = "Namespace Error";
    toastMessage = "Check your namespace configuration";
  }

  await showToast({
    style: Toast.Style.Failure,
    title,
    message: toastMessage,
  });
}

// ============================================================================
// Namespace Operations
// ============================================================================

interface ListNamespacesResponse {
  namespaces?: Array<{
    namespaceInfo?: {
      name?: string;
      state?: string;
      description?: string;
    };
  }>;
}

/**
 * List all available namespaces
 */
export async function listNamespaces(): Promise<NamespaceInfo[]> {
  const response = await apiRequest<ListNamespacesResponse>("GET", "/api/v1/namespaces");

  if (!response.namespaces) {
    return [];
  }

  return response.namespaces
    .map((ns) => ({
      name: ns.namespaceInfo?.name || "unknown",
      state: ns.namespaceInfo?.state || "unknown",
      description: ns.namespaceInfo?.description,
    }))
    .filter((ns) => ns.name !== "unknown");
}

// ============================================================================
// Workflow History
// ============================================================================

interface HistoryResponse {
  history?: {
    events?: Array<{
      eventId?: string;
      eventTime?: string;
      eventType?: string;
      [key: string]: unknown;
    }>;
  };
  nextPageToken?: string;
}

/**
 * Get workflow history events
 */
export async function getWorkflowHistory(
  workflowId: string,
  runId?: string
): Promise<HistoryEvent[]> {
  const namespace = getCurrentNamespace();

  let path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/workflows/${encodeURIComponent(workflowId)}/history`;

  const params = new URLSearchParams();
  if (runId) {
    params.set("execution.runId", runId);
  }
  params.set("maximumPageSize", "200");

  if (params.toString()) {
    path += `?${params.toString()}`;
  }

  const response = await apiRequest<HistoryResponse>("GET", path);

  if (!response.history?.events) {
    return [];
  }

  return response.history.events.map((event) => ({
    eventId: parseInt(event.eventId || "0", 10),
    eventTime: new Date(event.eventTime || Date.now()),
    eventType: formatEventType(event.eventType || "UNKNOWN"),
    details: extractEventDetails(event),
  }));
}

/**
 * Format event type to be more readable
 */
function formatEventType(eventType: string): string {
  return eventType
    .replace("EVENT_TYPE_", "")
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Extract relevant details from an event
 */
function extractEventDetails(event: Record<string, unknown>): Record<string, unknown> {
  const details: Record<string, unknown> = {};

  // Extract common attributes
  const attributeKeys = Object.keys(event).filter((key) => key.endsWith("Attributes"));

  for (const key of attributeKeys) {
    const attrs = event[key] as Record<string, unknown> | undefined;
    if (attrs) {
      // Copy all attributes
      Object.assign(details, attrs);

      // Extract activity type name if present
      if (attrs.activityType && typeof attrs.activityType === "object") {
        const activityType = attrs.activityType as { name?: string };
        if (activityType.name) {
          details.activityTypeName = activityType.name;
        }
      }

      // Extract workflow type name if present
      if (attrs.workflowType && typeof attrs.workflowType === "object") {
        const workflowType = attrs.workflowType as { name?: string };
        if (workflowType.name) {
          details.workflowTypeName = workflowType.name;
        }
      }
    }
  }

  return details;
}

// ============================================================================
// Signal Workflow
// ============================================================================

/**
 * Send a signal to a workflow
 */
export async function signalWorkflow(
  workflowId: string,
  signalName: string,
  payload?: unknown,
  runId?: string
): Promise<void> {
  const namespace = getCurrentNamespace();

  const path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/workflows/${encodeURIComponent(workflowId)}/signal/${encodeURIComponent(signalName)}`;

  const body: Record<string, unknown> = {
    workflowExecution: {
      workflowId,
      runId: runId || undefined,
    },
  };

  // Add payload if provided
  if (payload !== undefined) {
    const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    body.input = {
      payloads: [
        {
          metadata: { encoding: "anNvbi9wbGFpbg==" }, // "json/plain" in base64
          data: Buffer.from(payloadStr).toString("base64"),
        },
      ],
    };
  }

  await apiRequest<Record<string, unknown>>("POST", path, body);
}

// ============================================================================
// Query Workflow
// ============================================================================

interface QueryResponse {
  queryResult?: {
    payloads?: Array<{
      metadata?: { encoding?: string };
      data?: string;
    }>;
  };
  queryRejected?: {
    status?: string;
  };
}

/**
 * Query a workflow
 */
export async function queryWorkflow(
  workflowId: string,
  queryType: string,
  args?: unknown,
  runId?: string
): Promise<unknown> {
  const namespace = getCurrentNamespace();

  const path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/workflows/${encodeURIComponent(workflowId)}/query/${encodeURIComponent(queryType)}`;

  const body: Record<string, unknown> = {
    execution: {
      workflowId,
      runId: runId || undefined,
    },
    query: {
      queryType,
    },
  };

  // Add query args if provided
  if (args !== undefined) {
    const argsStr = typeof args === "string" ? args : JSON.stringify(args);
    (body.query as Record<string, unknown>).queryArgs = {
      payloads: [
        {
          metadata: { encoding: "anNvbi9wbGFpbg==" }, // "json/plain" in base64
          data: Buffer.from(argsStr).toString("base64"),
        },
      ],
    };
  }

  const response = await apiRequest<QueryResponse>("POST", path, body);

  if (response.queryRejected) {
    throw new Error(`Query rejected: ${response.queryRejected.status}`);
  }

  // Decode the response payload
  if (response.queryResult?.payloads?.[0]?.data) {
    const data = Buffer.from(response.queryResult.payloads[0].data, "base64").toString("utf-8");
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  return undefined;
}

// ============================================================================
// Schedules
// ============================================================================

interface ListSchedulesResponse {
  schedules?: Array<{
    scheduleId?: string;
    memo?: { fields?: Record<string, unknown> };
    info?: {
      numActions?: string;
      numActionsSkipped?: string;
      recentActions?: Array<{
        scheduleTime?: string;
        actualTime?: string;
        startWorkflowResult?: {
          workflowId?: string;
          runId?: string;
        };
      }>;
      futureActionTimes?: string[];
      paused?: boolean;
      createTime?: string;
      updateTime?: string;
    };
    searchAttributes?: { indexedFields?: Record<string, unknown> };
  }>;
  nextPageToken?: string;
}

interface DescribeScheduleResponse {
  schedule?: {
    spec?: Record<string, unknown>;
    action?: {
      startWorkflow?: {
        workflowType?: { name?: string };
        taskQueue?: { name?: string };
      };
    };
    policies?: Record<string, unknown>;
    state?: {
      paused?: boolean;
      notes?: string;
    };
  };
  info?: {
    numActions?: string;
    numActionsSkipped?: string;
    recentActions?: Array<{
      scheduleTime?: string;
      actualTime?: string;
      startWorkflowResult?: {
        workflowId?: string;
        runId?: string;
      };
    }>;
    futureActionTimes?: string[];
    createTime?: string;
    updateTime?: string;
  };
  memo?: { fields?: Record<string, unknown> };
  conflictToken?: string;
}

/**
 * List all schedules
 */
export async function listSchedules(): Promise<ScheduleInfo[]> {
  const namespace = getCurrentNamespace();

  const path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/schedules`;

  const response = await apiRequest<ListSchedulesResponse>("GET", path);

  if (!response.schedules) {
    return [];
  }

  return response.schedules.map((schedule) => ({
    scheduleId: schedule.scheduleId || "unknown",
    memo: schedule.memo?.fields,
    isPaused: schedule.info?.paused || false,
    numActions: parseInt(schedule.info?.numActions || "0", 10),
    numActionsSkipped: parseInt(schedule.info?.numActionsSkipped || "0", 10),
    nextActionTimes: (schedule.info?.futureActionTimes || []).map((t) => new Date(t)),
    recentActions: (schedule.info?.recentActions || []).map((a) => ({
      scheduledAt: new Date(a.scheduleTime || Date.now()),
      startedAt: new Date(a.actualTime || Date.now()),
      workflowId: a.startWorkflowResult?.workflowId,
      runId: a.startWorkflowResult?.runId,
    })),
    createdAt: schedule.info?.createTime ? new Date(schedule.info.createTime) : undefined,
    updatedAt: schedule.info?.updateTime ? new Date(schedule.info.updateTime) : undefined,
  }));
}

/**
 * Get schedule details
 */
export async function getScheduleDetails(scheduleId: string): Promise<{
  schedule: ScheduleInfo;
  workflowType?: string;
  taskQueue?: string;
  spec?: Record<string, unknown>;
}> {
  const namespace = getCurrentNamespace();

  const path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/schedules/${encodeURIComponent(scheduleId)}`;

  const response = await apiRequest<DescribeScheduleResponse>("GET", path);

  return {
    schedule: {
      scheduleId,
      memo: response.memo?.fields,
      isPaused: response.schedule?.state?.paused || false,
      numActions: parseInt(response.info?.numActions || "0", 10),
      numActionsSkipped: parseInt(response.info?.numActionsSkipped || "0", 10),
      nextActionTimes: (response.info?.futureActionTimes || []).map((t) => new Date(t)),
      recentActions: (response.info?.recentActions || []).map((a) => ({
        scheduledAt: new Date(a.scheduleTime || Date.now()),
        startedAt: new Date(a.actualTime || Date.now()),
        workflowId: a.startWorkflowResult?.workflowId,
        runId: a.startWorkflowResult?.runId,
      })),
      workflowType: response.schedule?.action?.startWorkflow?.workflowType?.name,
      createdAt: response.info?.createTime ? new Date(response.info.createTime) : undefined,
      updatedAt: response.info?.updateTime ? new Date(response.info.updateTime) : undefined,
    },
    workflowType: response.schedule?.action?.startWorkflow?.workflowType?.name,
    taskQueue: response.schedule?.action?.startWorkflow?.taskQueue?.name,
    spec: response.schedule?.spec,
  };
}

/**
 * Pause a schedule
 */
export async function pauseSchedule(scheduleId: string, reason?: string): Promise<void> {
  const namespace = getCurrentNamespace();

  const path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/schedules/${encodeURIComponent(scheduleId)}/patch`;

  await apiRequest<Record<string, unknown>>("POST", path, {
    patch: {
      pause: reason || "Paused via Raycast",
    },
    identity: "raycast-temporal-extension",
    requestId: crypto.randomUUID(),
  });
}

/**
 * Unpause a schedule
 */
export async function unpauseSchedule(scheduleId: string, reason?: string): Promise<void> {
  const namespace = getCurrentNamespace();

  const path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/schedules/${encodeURIComponent(scheduleId)}/patch`;

  await apiRequest<Record<string, unknown>>("POST", path, {
    patch: {
      unpause: reason || "Unpaused via Raycast",
    },
    identity: "raycast-temporal-extension",
    requestId: crypto.randomUUID(),
  });
}

/**
 * Trigger a schedule immediately
 */
export async function triggerSchedule(scheduleId: string): Promise<void> {
  const namespace = getCurrentNamespace();

  const path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/schedules/${encodeURIComponent(scheduleId)}/patch`;

  await apiRequest<Record<string, unknown>>("POST", path, {
    patch: {
      triggerImmediately: {
        overlapPolicy: "SCHEDULE_OVERLAP_POLICY_ALLOW_ALL",
      },
    },
    identity: "raycast-temporal-extension",
    requestId: crypto.randomUUID(),
  });
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  const namespace = getCurrentNamespace();

  const path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/schedules/${encodeURIComponent(scheduleId)}`;

  await apiRequest<Record<string, unknown>>("DELETE", path);
}

// ============================================================================
// Start Workflow
// ============================================================================

interface StartWorkflowResponse {
  runId?: string;
  started?: boolean;
}

/**
 * Start a new workflow
 */
export async function startWorkflow(params: {
  workflowId: string;
  workflowType: string;
  taskQueue: string;
  input?: unknown;
}): Promise<{ runId: string }> {
  const namespace = getCurrentNamespace();

  const path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/workflows/${encodeURIComponent(params.workflowId)}`;

  const body: Record<string, unknown> = {
    workflowType: { name: params.workflowType },
    taskQueue: { name: params.taskQueue },
    identity: "raycast-temporal-extension",
    requestId: crypto.randomUUID(),
  };

  // Add input if provided
  if (params.input !== undefined) {
    const inputStr = typeof params.input === "string" ? params.input : JSON.stringify(params.input);
    body.input = {
      payloads: [
        {
          metadata: { encoding: "anNvbi9wbGFpbg==" }, // "json/plain" in base64
          data: Buffer.from(inputStr).toString("base64"),
        },
      ],
    };
  }

  const response = await apiRequest<StartWorkflowResponse>("POST", path, body);

  return { runId: response.runId || "unknown" };
}

// ============================================================================
// Reset Workflow
// ============================================================================

interface ResetWorkflowResponse {
  runId?: string;
}

/**
 * Reset a workflow to a specific event
 */
export async function resetWorkflow(params: {
  workflowId: string;
  runId: string;
  workflowTaskFinishEventId: number;
  reason: string;
  resetReapplyType?:
    | "RESET_REAPPLY_TYPE_SIGNAL"
    | "RESET_REAPPLY_TYPE_NONE"
    | "RESET_REAPPLY_TYPE_ALL_ELIGIBLE";
}): Promise<{ runId: string }> {
  const namespace = getCurrentNamespace();

  const path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/workflows/${encodeURIComponent(params.workflowId)}/reset`;

  const body: Record<string, unknown> = {
    workflowExecution: {
      workflowId: params.workflowId,
      runId: params.runId,
    },
    workflowTaskFinishEventId: params.workflowTaskFinishEventId,
    reason: params.reason,
    resetReapplyType: params.resetReapplyType || "RESET_REAPPLY_TYPE_SIGNAL",
    requestId: crypto.randomUUID(),
  };

  const response = await apiRequest<ResetWorkflowResponse>("POST", path, body);

  return { runId: response.runId || "unknown" };
}

// ============================================================================
// Search Attributes
// ============================================================================

interface SearchAttributesResponse {
  systemAttributes?: Record<string, string>;
  customAttributes?: Record<string, string>;
  storageSchema?: Record<string, string>;
}

/**
 * Get search attributes for the namespace
 */
export async function getSearchAttributes(): Promise<{
  system: Array<{ name: string; type: string }>;
  custom: Array<{ name: string; type: string }>;
}> {
  const namespace = getCurrentNamespace();

  const path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/search-attributes`;

  const response = await apiRequest<SearchAttributesResponse>("GET", path);

  const formatType = (type: string) => type.replace("INDEXED_VALUE_TYPE_", "");

  const system = Object.entries(response.systemAttributes || {}).map(([name, type]) => ({
    name,
    type: formatType(type),
  }));

  const custom = Object.entries(response.customAttributes || {}).map(([name, type]) => ({
    name,
    type: formatType(type),
  }));

  return { system, custom };
}

// ============================================================================
// Batch Operations
// ============================================================================

interface CountWorkflowsResponse {
  count?: string;
}

/**
 * Count workflows matching a query
 */
export async function countWorkflows(query: string): Promise<number> {
  const namespace = getCurrentNamespace();

  const path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/workflow-count?query=${encodeURIComponent(query)}`;

  const response = await apiRequest<CountWorkflowsResponse>("GET", path);

  return parseInt(response.count || "0", 10);
}

interface BatchOperationResponse {
  operationToken?: string;
  jobId?: string;
}

/**
 * Start a batch cancel operation
 */
export async function batchCancelWorkflows(
  query: string,
  reason: string
): Promise<{ jobId: string }> {
  const namespace = getCurrentNamespace();

  const path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/batch-operations/cancel`;

  const body = {
    jobId: crypto.randomUUID(),
    visibilityQuery: query,
    reason,
    identity: "raycast-temporal-extension",
  };

  const response = await apiRequest<BatchOperationResponse>("POST", path, body);

  return { jobId: response.jobId || body.jobId };
}

/**
 * Start a batch terminate operation
 */
export async function batchTerminateWorkflows(
  query: string,
  reason: string
): Promise<{ jobId: string }> {
  const namespace = getCurrentNamespace();

  const path = `/api/v1/namespaces/${encodeURIComponent(namespace)}/batch-operations/terminate`;

  const body = {
    jobId: crypto.randomUUID(),
    visibilityQuery: query,
    reason,
    identity: "raycast-temporal-extension",
  };

  const response = await apiRequest<BatchOperationResponse>("POST", path, body);

  return { jobId: response.jobId || body.jobId };
}
