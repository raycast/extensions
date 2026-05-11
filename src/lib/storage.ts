import { LocalStorage } from "@raycast/api";
import { WorkflowInfo } from "./types";

const RECENT_WORKFLOWS_KEY = "recentWorkflows";
const SELECTED_NAMESPACE_KEY = "selectedNamespace";
const MAX_RECENT_WORKFLOWS = 10;

/**
 * Minimal workflow info for storage (to reduce storage size)
 */
export interface RecentWorkflow {
  workflowId: string;
  runId: string;
  type: string;
  namespace: string;
  viewedAt: number; // timestamp
}

/**
 * Get recently viewed workflows
 */
export async function getRecentWorkflows(): Promise<RecentWorkflow[]> {
  const stored = await LocalStorage.getItem<string>(RECENT_WORKFLOWS_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as RecentWorkflow[];
  } catch {
    return [];
  }
}

/**
 * Add a workflow to recent workflows
 */
export async function addRecentWorkflow(workflow: WorkflowInfo, namespace: string): Promise<void> {
  const recents = await getRecentWorkflows();

  // Remove if already exists (will re-add at top)
  const filtered = recents.filter(
    (r) => !(r.workflowId === workflow.workflowId && r.runId === workflow.runId)
  );

  // Add to beginning
  const newRecent: RecentWorkflow = {
    workflowId: workflow.workflowId,
    runId: workflow.runId,
    type: workflow.type,
    namespace,
    viewedAt: Date.now(),
  };

  const updated = [newRecent, ...filtered].slice(0, MAX_RECENT_WORKFLOWS);

  await LocalStorage.setItem(RECENT_WORKFLOWS_KEY, JSON.stringify(updated));
}

/**
 * Clear recent workflows
 */
export async function clearRecentWorkflows(): Promise<void> {
  await LocalStorage.removeItem(RECENT_WORKFLOWS_KEY);
}

/**
 * Get the selected namespace (if any)
 */
export async function getSelectedNamespace(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(SELECTED_NAMESPACE_KEY);
}

/**
 * Set the selected namespace
 */
export async function setSelectedNamespace(namespace: string): Promise<void> {
  await LocalStorage.setItem(SELECTED_NAMESPACE_KEY, namespace);
}
