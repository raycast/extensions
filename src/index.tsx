import { Detail, LocalStorage, ActionPanel, Action, Form } from "@raycast/api";
import React, { useEffect, useState } from "react";

export default function Command() {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    LocalStorage.getItem<string>("scratchpad").then((value) => {
      if (value) setText(value);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isLoading && isEditing) {
      const timer = setTimeout(() => {
        LocalStorage.setItem("scratchpad", text);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [text, isLoading, isEditing]);

  if (isEditing) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action
              title="Done Editing"
              onAction={() => setIsEditing(false)}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea
          id="scratchpad"
          value={text}
          onChange={setText}
          placeholder="Type here... Press Cmd+Enter to see rendered preview. Math: \(...\) for inline, $$...$$ for block"
        />
      </Form>
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={text || "Press Enter to start typing"}
      actions={
        <ActionPanel>
          <Action title="Edit" onAction={() => setIsEditing(true)} />
        </ActionPanel>
      }
    />
  );
}
