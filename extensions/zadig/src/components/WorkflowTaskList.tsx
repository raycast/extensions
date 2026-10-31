import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  cancelWorkflowTask,
  getWorkflowTasks,
  getWorkflowTaskUrl,
  retryWorkflowTask,
  type Workflow,
  type WorkflowTask,
} from "../api/workflows";
import { getStatusIcon } from "../utils/status";
import WorkflowTaskDetail from "./WorkflowTaskDetail";

const PAGE_SIZE = 50;
const CANCELLABLE_STATUSES = ["created", "running", "waiting"];
const RETRYABLE_STATUSES = ["failed", "cancelled", "timeout", "reject"];

type WorkflowTaskListProps = {
  projectKey: string;
  workflow: Workflow;
};

export default function WorkflowTaskList({ projectKey, workflow }: WorkflowTaskListProps) {
  const {
    data: tasks,
    isLoading,
    pagination,
    revalidate,
  } = useCachedPromise(
    (projectKey: string, workflowKey: string) =>
      async ({ page }: { page: number }) => {
        const { total, workflow_tasks } = await getWorkflowTasks(projectKey, workflowKey, page + 1, PAGE_SIZE);

        return { data: workflow_tasks ?? [], hasMore: (page + 1) * PAGE_SIZE < total };
      },
    [projectKey, workflow.workflow_key],
  );

  const [refreshCount, setRefreshCount] = useState(0);

  const uniqueTasks = [...new Map(tasks?.map(task => [task.task_id, task])).values()];

  function refresh() {
    revalidate();
    setRefreshCount(count => count + 1);
  }

  async function confirmCancel(task: WorkflowTask) {
    const isConfirmed = await confirmAlert({
      title: `Cancel run #${task.task_id}?`,
      message: `This stops ${workflow.workflow_name} #${task.task_id} where it is.`,
      primaryAction: { title: "Cancel Run", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Keep Running" },
    });

    if (!isConfirmed) {
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: `Canceling run #${task.task_id}` });

    try {
      await cancelWorkflowTask(task.workflow_key, task.task_id);
      toast.style = Toast.Style.Success;
      toast.title = `Canceled run #${task.task_id}`;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to cancel run #${task.task_id}`;
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  async function confirmRetry(task: WorkflowTask) {
    const isConfirmed = await confirmAlert({
      title: `Retry run #${task.task_id}?`,
      message: `This reruns the jobs of ${workflow.workflow_name} #${task.task_id} that did not pass, with the same inputs, deploy jobs included.`,
      primaryAction: { title: "Retry Run" },
    });

    if (!isConfirmed) {
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: `Retrying run #${task.task_id}` });

    try {
      await retryWorkflowTask(projectKey, task.workflow_key, task.task_id);
      toast.style = Toast.Style.Success;
      toast.title = `Retried run #${task.task_id}`;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to retry run #${task.task_id}`;
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  return (
    <List
      isShowingDetail
      navigationTitle={workflow.workflow_name}
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Filter loaded runs by number, creator or status"
    >
      {!isLoading && <List.EmptyView icon={Icon.Boat} title="No Runs Found" />}
      {uniqueTasks.map(task => {
        const taskUrl = getWorkflowTaskUrl(projectKey, task.workflow_key, task.task_id);

        return (
          <List.Item
            key={task.task_id}
            icon={{ value: getStatusIcon(task.status), tooltip: task.status }}
            title={`#${task.task_id}`}
            keywords={[task.task_creator, task.status]}
            detail={<WorkflowTaskDetail key={`${task.task_id}-${task.status}-${refreshCount}`} task={task} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser url={taskUrl} />
                  <Action.CopyToClipboard title="Copy Link" content={taskUrl} />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={refresh}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Operations">
                  {RETRYABLE_STATUSES.includes(task.status) && (
                    <Action title="Retry Run" icon={Icon.Repeat} onAction={() => confirmRetry(task)} />
                  )}
                  {CANCELLABLE_STATUSES.includes(task.status) && (
                    <Action
                      title="Cancel Run"
                      icon={Icon.XMarkCircle}
                      style={Action.Style.Destructive}
                      onAction={() => confirmCancel(task)}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
