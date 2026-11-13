// src/components/ai-action.tsx
import { Action, Icon } from "@raycast/api";
import { AIResultView } from "./ai-result-view";
import { AIConnectionView } from "./ai-connection-view";

export function AIAction(props: { content: string; selectedText: string; isLoading: boolean }) {
  if (props.isLoading) return <Action title="Reading Selected Text" icon={Icon.Clock} onAction={() => undefined} />;
  return (
    <>
      <Action.Push
        title="Ask AI with Prompt"
        icon={Icon.Message}
        shortcut={{ modifiers: ["cmd"], key: "y" }}
        target={<AIResultView content={props.content} selectedText={props.selectedText} />}
      />
      <Action.Push
        title="Check AI Connection"
        icon={Icon.Network}
        target={<AIConnectionView navigationTitle="AI Connection Check" />}
      />
    </>
  );
}
