import { getBaseUrl, request } from "./request";

export type Workflow = {
  workflow_key: string;
  workflow_name: string;
  type: string;
  update_by: string;
  update_time: number;
};

export type WorkflowTask = {
  task_id: number;
  workflow_key: string;
  task_creator: string;
  create_time: number;
  start_time: number;
  end_time: number;
  status: string;
};

type WorkflowTaskPage = {
  total: number;
  workflow_tasks: WorkflowTask[] | null;
};

type WorkflowTaskResponse = {
  params: { name: string; type: string; value: string }[] | null;
  stages:
    | {
        name: string;
        status: string;
        jobs:
          | {
              type: string;
              spec?: {
                // Zadig leaves out the commit fields for a repository built without a pinned commit.
                repos?:
                  | { repo_name: string; branch: string; commit_id?: string | null; commit_message?: string | null }[]
                  | null;
              };
            }[]
          | null;
      }[]
    | null;
};

export type WorkflowTaskBuild = {
  repoName: string;
  branch: string;
  commitId?: string;
  commitMessage?: string;
};

export type WorkflowTaskDetail = {
  choices: { name: string; value: string }[];
  stages: { name: string; status: string }[];
  builds: WorkflowTaskBuild[];
};

// TODO: Start a run from a form built on GET /workflows/custom/:workflowKey/detail.

export async function getWorkflows(projectKey: string) {
  const { workflows } = await request<{ workflows: Workflow[] | null }>("/workflows", { params: { projectKey } });

  return (workflows ?? []).filter(workflow => workflow.type === "custom");
}

export const getWorkflowTasks = (projectKey: string, workflowKey: string, pageNum: number, pageSize: number) =>
  request<WorkflowTaskPage>(`/workflows/custom/${encodeURIComponent(workflowKey)}/tasks`, {
    params: { projectKey, pageNum, pageSize },
  });

export const cancelWorkflowTask = (workflowKey: string, taskId: number) =>
  request<void>("/workflows/custom/task", { method: "DELETE", params: { workflowKey, taskId } });

export const retryWorkflowTask = (projectKey: string, workflowKey: string, taskId: number) =>
  request<void>(`/workflows/custom/${encodeURIComponent(workflowKey)}/task/${taskId}`, {
    method: "POST",
    params: { projectKey },
  });

export async function getWorkflowTask(workflowKey: string, taskId: number): Promise<WorkflowTaskDetail> {
  const task = await request<WorkflowTaskResponse>("/workflows/custom/task", { params: { workflowKey, taskId } });
  const stages = task.stages ?? [];
  const builds = stages
    .flatMap(stage => stage.jobs ?? [])
    .filter(job => job.type === "zadig-build")
    .flatMap(job =>
      (job.spec?.repos ?? []).map(repo => ({
        repoName: repo.repo_name,
        branch: repo.branch,
        commitId: repo.commit_id ?? undefined,
        commitMessage: repo.commit_message ?? undefined,
      })),
    );

  return {
    // NOTE: Choice parameters hold picked options such as the target environment, while free-text parameters may hold secrets.
    choices: (task.params ?? []).filter(param => param.type === "choice").map(({ name, value }) => ({ name, value })),
    stages: stages.map(({ name, status }) => ({ name, status })),
    // NOTE: Several build jobs often build the same commit for different services, so each commit is listed once.
    builds: builds.filter(
      (build, index) =>
        builds.findIndex(({ repoName, commitId }) => repoName === build.repoName && commitId === build.commitId) ===
        index,
    ),
  };
}

export const getWorkflowTaskUrl = (projectKey: string, workflowKey: string, taskId: number) =>
  `${getBaseUrl()}/v1/projects/detail/${encodeURIComponent(projectKey)}/pipelines/custom/${encodeURIComponent(workflowKey)}/${taskId}?${new URLSearchParams({ status: "", id: "", display_name: workflowKey })}`;
