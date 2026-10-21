import { Color, List } from "@raycast/api";
import { getAvatarIcon, useCachedPromise } from "@raycast/utils";
import { getWorkflowTask, type WorkflowTask, type WorkflowTaskBuild } from "../api/workflows";
import { formatTime } from "../utils/time";
import { escapeMarkdown } from "../utils/markdown";
import { getStatusColor } from "../utils/status";

type WorkflowTaskDetailProps = {
  task: WorkflowTask;
};

const toRepositoriesMarkdown = (builds: WorkflowTaskBuild[]) =>
  [
    `## Repositories (${builds.length})`,
    ...builds.map(build =>
      [
        `### ${escapeMarkdown(build.repoName)}`,
        `- Branch: ${escapeMarkdown(build.branch)}`,
        `- Commit: ${build.commitId ? escapeMarkdown(build.commitId.slice(0, 7)) : "-"}`,
        `- Subject: ${build.commitMessage ? escapeMarkdown(build.commitMessage.split("\n")[0]) : "-"}`,
      ].join("\n"),
    ),
  ].join("\n\n");

export default function WorkflowTaskDetail({ task }: WorkflowTaskDetailProps) {
  const { data: detail, isLoading } = useCachedPromise(getWorkflowTask, [task.workflow_key, task.task_id]);

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={detail && detail.builds.length > 0 ? toRepositoriesMarkdown(detail.builds) : undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item text={task.status} color={getStatusColor(task.status)} />
          </List.Item.Detail.Metadata.TagList>
          {detail && detail.stages.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Stages">
              {detail.stages.map(stage => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={stage.name}
                  text={stage.name}
                  color={Color.SecondaryText}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          {detail?.choices.map(choice => (
            <List.Item.Detail.Metadata.Label key={choice.name} title={choice.name} text={choice.value} />
          ))}
          <List.Item.Detail.Metadata.Label
            title="Started By"
            icon={getAvatarIcon(task.task_creator)}
            text={task.task_creator}
          />
          <List.Item.Detail.Metadata.Label title="Created" text={formatTime(task.create_time)} />
          <List.Item.Detail.Metadata.Label title="Started" text={formatTime(task.start_time)} />
          <List.Item.Detail.Metadata.Label title="Ended" text={formatTime(task.end_time)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
