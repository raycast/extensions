import { Action, ActionPanel, List } from "@raycast/api";
import { unblockPipeline } from "../components/UnblockPipeline";
import { BuildFragment } from "../generated/graphql";
import { timeAgo } from "../utils/format";
import { getStateIcon } from "../utils/states";

interface BuildListItemProps {
  build: BuildFragment;
}

export function BuildListItem({ build }: BuildListItemProps) {
  return (
    <List.Item
      id={build.id}
      title={build.message ?? ""}
      subtitle={build.pipeline?.name ?? `#${build.number}`}
      icon={getStateIcon(build.state)}
      keywords={[build.pipeline?.name || "", build.number.toString()]}
      accessories={[{ text: timeAgo(build.createdAt) }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={build.url} />
          <Action.CopyToClipboard content={build.url} title="Copy URL" />
          <Action
            title="Unblock Pipeline"
            icon="🔐"
            shortcut={{ modifiers: ["opt", "shift"], key: "u" }}
            onAction={() => unblockPipeline(build.pipeline.name, build.number)}
          />
        </ActionPanel>
      }
    />
  );
}
