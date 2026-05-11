import { getCurrentNamespace } from "./temporal-client";

/**
 * Generate temporal CLI commands for workflows
 */

export function getDescribeCommand(workflowId: string, runId?: string): string {
  const namespace = getCurrentNamespace();
  let cmd = `temporal workflow describe --workflow-id "${workflowId}"`;
  if (runId) {
    cmd += ` --run-id "${runId}"`;
  }
  cmd += ` --namespace "${namespace}"`;
  return cmd;
}

export function getCancelCommand(workflowId: string, runId?: string): string {
  const namespace = getCurrentNamespace();
  let cmd = `temporal workflow cancel --workflow-id "${workflowId}"`;
  if (runId) {
    cmd += ` --run-id "${runId}"`;
  }
  cmd += ` --namespace "${namespace}"`;
  return cmd;
}

export function getTerminateCommand(workflowId: string, reason?: string, runId?: string): string {
  const namespace = getCurrentNamespace();
  let cmd = `temporal workflow terminate --workflow-id "${workflowId}"`;
  if (runId) {
    cmd += ` --run-id "${runId}"`;
  }
  if (reason) {
    cmd += ` --reason "${reason}"`;
  }
  cmd += ` --namespace "${namespace}"`;
  return cmd;
}

export function getSignalCommand(workflowId: string, signalName?: string, runId?: string): string {
  const namespace = getCurrentNamespace();
  let cmd = `temporal workflow signal --workflow-id "${workflowId}"`;
  if (runId) {
    cmd += ` --run-id "${runId}"`;
  }
  cmd += ` --name "${signalName || "SIGNAL_NAME"}"`;
  cmd += ` --namespace "${namespace}"`;
  // User can add: --input '{"key": "value"}'
  return cmd;
}

export function getQueryCommand(workflowId: string, queryType?: string, runId?: string): string {
  const namespace = getCurrentNamespace();
  let cmd = `temporal workflow query --workflow-id "${workflowId}"`;
  if (runId) {
    cmd += ` --run-id "${runId}"`;
  }
  cmd += ` --type "${queryType || "QUERY_TYPE"}"`;
  cmd += ` --namespace "${namespace}"`;
  return cmd;
}

export function getResetCommand(workflowId: string, eventId: number, runId?: string): string {
  const namespace = getCurrentNamespace();
  let cmd = `temporal workflow reset --workflow-id "${workflowId}"`;
  if (runId) {
    cmd += ` --run-id "${runId}"`;
  }
  cmd += ` --event-id ${eventId}`;
  cmd += ` --namespace "${namespace}"`;
  return cmd;
}

export function getShowCommand(workflowId: string, runId?: string): string {
  const namespace = getCurrentNamespace();
  let cmd = `temporal workflow show --workflow-id "${workflowId}"`;
  if (runId) {
    cmd += ` --run-id "${runId}"`;
  }
  cmd += ` --namespace "${namespace}"`;
  return cmd;
}

export function getListCommand(query?: string): string {
  const namespace = getCurrentNamespace();
  let cmd = `temporal workflow list --namespace "${namespace}"`;
  if (query) {
    cmd += ` --query "${query}"`;
  }
  return cmd;
}
