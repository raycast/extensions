// src/components/ai-action.tsx
import { Action, Icon } from "@raycast/api";
import { AIResultView } from "./ai-result-view";

export function AIAction(props: { content: string }) {
  return (
    <Action.Push
      title="Ask AI About Gist"
      icon={Icon.Message}
      shortcut={{ modifiers: ["cmd"], key: "y" }}
      target={<AIResultView content={props.content} />}
    />
  );
}
