import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getAvatarIcon, useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { getWorkflows } from "./api/workflows";
import ProjectDropdown from "./components/ProjectDropdown";
import WorkflowTaskList from "./components/WorkflowTaskList";
import { useProjects } from "./hooks/useProjects";

export default function SearchWorkflows() {
  const { projects, project, isLoading: isLoadingProjects, setProjectKey } = useProjects("searchWorkflows");
  const projectKey = project?.project_key ?? "";
  const { data: workflows, isLoading: isLoadingWorkflows } = useCachedPromise(getWorkflows, [projectKey], {
    execute: Boolean(projectKey),
  });
  const isLoading = isLoadingProjects || isLoadingWorkflows;
  const { data: sortedWorkflows, visitItem } = useFrecencySorting(workflows, {
    namespace: "workflows",
    key: workflow => `${projectKey}/${workflow.workflow_key}`,
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search workflows"
      searchBarAccessory={<ProjectDropdown projects={projects} value={project?.project_key} onChange={setProjectKey} />}
    >
      {!isLoading && (
        <List.EmptyView
          icon={Icon.Bolt}
          title="No Custom Workflows Found"
          description="Only custom workflows are listed, because only they have run endpoints in the Zadig OpenAPI."
        />
      )}
      {sortedWorkflows.map(workflow => (
        <List.Item
          key={workflow.workflow_key}
          title={workflow.workflow_name}
          subtitle={workflow.workflow_key === workflow.workflow_name ? undefined : workflow.workflow_key}
          keywords={[workflow.workflow_key]}
          accessories={[
            { date: new Date(workflow.update_time * 1000), tooltip: "Last updated" },
            { icon: getAvatarIcon(workflow.update_by), tooltip: workflow.update_by },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Runs"
                icon={Icon.List}
                target={<WorkflowTaskList projectKey={projectKey} workflow={workflow} />}
                onPush={() => visitItem(workflow)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
