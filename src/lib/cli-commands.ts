import { getCurrentNamespace, getCurrentCluster } from "./temporal-client";

/**
 * Generate temporal CLI commands for workflows
 *
 * For non-local clusters, includes --address flag
 */

/**
 * Get the address flag if not using localhost
 */
function getAddressFlag(): string {
  const cluster = getCurrentCluster();
  const url = cluster.url;

  // Extract host from URL
  try {
    const parsed = new URL(url);
    const host = parsed.host;

    // Skip address flag for localhost
    if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
      return "";
    }

    // For Temporal Cloud, the CLI uses a different address format
    // Cloud URLs look like: https://<namespace>.<accountId>.tmprl.cloud
    // CLI address should be: <namespace>.<accountId>.tmprl.cloud:7233
    if (host.includes("tmprl.cloud")) {
      return ` --address "${host}:7233"`;
    }

    // For other remote servers, use the host with default gRPC port
    return ` --address "${host}:7233"`;
  } catch {
    return "";
  }
}

export function getDescribeCommand(workflowId: string, runId?: string): string {
  const namespace = getCurrentNamespace();
  const addressFlag = getAddressFlag();
  let cmd = `temporal workflow describe --workflow-id "${workflowId}"`;
  if (runId) {
    cmd += ` --run-id "${runId}"`;
  }
  cmd += ` --namespace "${namespace}"`;
  cmd += addressFlag;
  return cmd;
}

export function getCancelCommand(workflowId: string, runId?: string): string {
  const namespace = getCurrentNamespace();
  const addressFlag = getAddressFlag();
  let cmd = `temporal workflow cancel --workflow-id "${workflowId}"`;
  if (runId) {
    cmd += ` --run-id "${runId}"`;
  }
  cmd += ` --namespace "${namespace}"`;
  cmd += addressFlag;
  return cmd;
}

export function getTerminateCommand(workflowId: string, reason?: string, runId?: string): string {
  const namespace = getCurrentNamespace();
  const addressFlag = getAddressFlag();
  let cmd = `temporal workflow terminate --workflow-id "${workflowId}"`;
  if (runId) {
    cmd += ` --run-id "${runId}"`;
  }
  if (reason) {
    cmd += ` --reason "${reason}"`;
  }
  cmd += ` --namespace "${namespace}"`;
  cmd += addressFlag;
  return cmd;
}

export function getSignalCommand(workflowId: string, signalName?: string, runId?: string): string {
  const namespace = getCurrentNamespace();
  const addressFlag = getAddressFlag();
  let cmd = `temporal workflow signal --workflow-id "${workflowId}"`;
  if (runId) {
    cmd += ` --run-id "${runId}"`;
  }
  cmd += ` --name "${signalName || "SIGNAL_NAME"}"`;
  cmd += ` --namespace "${namespace}"`;
  cmd += addressFlag;
  // User can add: --input '{"key": "value"}'
  return cmd;
}

export function getQueryCommand(workflowId: string, queryType?: string, runId?: string): string {
  const namespace = getCurrentNamespace();
  const addressFlag = getAddressFlag();
  let cmd = `temporal workflow query --workflow-id "${workflowId}"`;
  if (runId) {
    cmd += ` --run-id "${runId}"`;
  }
  cmd += ` --type "${queryType || "QUERY_TYPE"}"`;
  cmd += ` --namespace "${namespace}"`;
  cmd += addressFlag;
  return cmd;
}

export function getResetCommand(workflowId: string, eventId: number, runId?: string): string {
  const namespace = getCurrentNamespace();
  const addressFlag = getAddressFlag();
  let cmd = `temporal workflow reset --workflow-id "${workflowId}"`;
  if (runId) {
    cmd += ` --run-id "${runId}"`;
  }
  cmd += ` --event-id ${eventId}`;
  cmd += ` --namespace "${namespace}"`;
  cmd += addressFlag;
  return cmd;
}

export function getShowCommand(workflowId: string, runId?: string): string {
  const namespace = getCurrentNamespace();
  const addressFlag = getAddressFlag();
  let cmd = `temporal workflow show --workflow-id "${workflowId}"`;
  if (runId) {
    cmd += ` --run-id "${runId}"`;
  }
  cmd += ` --namespace "${namespace}"`;
  cmd += addressFlag;
  return cmd;
}

export function getListCommand(query?: string): string {
  const namespace = getCurrentNamespace();
  const addressFlag = getAddressFlag();
  let cmd = `temporal workflow list --namespace "${namespace}"`;
  if (query) {
    cmd += ` --query "${query}"`;
  }
  cmd += addressFlag;
  return cmd;
}
