import React, { useState, useEffect } from "react";
import { Detail, ActionPanel, Action, Icon, Form, useNavigation } from "@raycast/api";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  language?: "javascript" | "typescript" | "json" | "html" | "css";
  title?: string;
  onSave?: (code: string) => void;
  onCancel?: () => void;
}

/**
 * A code editor component that provides syntax highlighting.
 * Uses Detail view with Markdown code blocks for highlighting and a Form for editing.
 */
export function CodeEditor({
  code,
  onChange,
  language = "javascript",
  title = "Code Editor",
  onSave,
  onCancel,
}: CodeEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(code);
  const { pop } = useNavigation();

  // Keep editedCode in sync with code prop changes when not editing
  useEffect(() => {
    if (!isEditing) {
      setEditedCode(code);
    }
  }, [code, isEditing]);

  const handleSave = () => {
    if (onSave) {
      onSave(editedCode);
    } else {
      onChange(editedCode);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedCode(code);
    setIsEditing(false);
    if (onCancel) {
      onCancel();
    }
  };

  // Edit mode
  if (isEditing) {
    return (
      <Form
        navigationTitle={`Edit ${title}`}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save"
              icon={Icon.Check}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onSubmit={() => handleSave()}
            />
            <Action
              title="Cancel"
              icon={Icon.XmarkCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={handleCancel}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea
          id="code"
          title="Code"
          placeholder="Enter your code here"
          value={editedCode}
          onChange={setEditedCode}
          enableMarkdown={false}
          autoFocus
        />
      </Form>
    );
  }

  // View mode with syntax highlighting
  return (
    <Detail
      navigationTitle={title}
      markdown={`\`\`\`${language}\n${editedCode}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action
            title="Edit"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() => setIsEditing(true)}
          />
          {onSave && (
            <Action
              title="Save"
              icon={Icon.Check}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              onAction={() => {
                if (onSave) onSave(editedCode);
                pop();
              }}
            />
          )}
          {onCancel && (
            <Action
              title="Cancel"
              icon={Icon.XmarkCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() => {
                if (onCancel) onCancel();
                setEditedCode(code); // Reset to original code on cancel
                pop();
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
