import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useState } from "react";
import { singleChat } from "./api/pollinations";
import type { Message } from "./api/pollinations";

const SYSTEM_PROMPT: Message = {
  role: "system",
  content:
    "You are a helpful AI assistant. Be concise and clear. Format responses in Markdown when appropriate.",
};

export default function QuickAskCommand() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async (values: { question: string }) => {
    const q = values.question.trim();
    if (!q) return;

    setIsLoading(true);
    setAnswer(null);

    try {
      const result = await singleChat([
        SYSTEM_PROMPT,
        { role: "user", content: q },
      ]);
      setAnswer(result);
    } catch (err) {
      await showToast({
        title: "Error",
        message: err instanceof Error ? err.message : "Something went wrong",
        style: Toast.Style.Failure,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (answer !== null) {
    const markdown = `## Question\n\n${question}\n\n---\n\n## Answer\n\n${answer}`;
    return (
      <Detail
        markdown={markdown}
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action
              title="Copy Answer"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(answer);
                await showToast({
                  title: "Copied!",
                  style: Toast.Style.Success,
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Ask Another"
              icon={Icon.RotateClockwise}
              onAction={() => {
                setAnswer(null);
                setQuestion("");
              }}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask"
            icon={Icon.Message}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="What would you like to know?"
        value={question}
        onChange={setQuestion}
        autoFocus
      />
    </Form>
  );
}
