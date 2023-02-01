import fs from "fs";
import os from "os";
import { Action, ActionPanel, Form, popToRoot, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";

export default function Command() {
  // Handle if user has no ~/notes directory
  useEffect(() => {
    try {
      fs.readdirSync(`${os.homedir()}/notes`);
    } catch {
      fs.mkdirSync(`${os.homedir()}/notes`);
    }
  }, []);

  // Local state
  const [nameError, setNameError] = useState<string>();
  const [name, setName] = useState<string>("New note");
  const [bodyError, setBodyError] = useState<string>();
  const [body, setBody] = useState<string>("");

  // Helpers
  function resetValues() {
    setName("");
    setBody("");
  }

  function resetErrors() {
    setNameError("");
    setBodyError("");
  }

  function resetForm() {
    resetValues();
    resetErrors();
  }

  // Handles form validation
  function validateForm() {
    if (!name) {
      setNameError("Please add a name");
      return;
    }

    if (!body) {
      setBodyError("Please add a body");
      return;
    }

    const notes = fs.readdirSync(`${os.homedir()}/notes`);

    if (notes?.some((noteName) => noteName === name + ".md")) {
      setNameError("Conflicting name");
      return;
    }

    resetErrors();

    return true;
  }

  // When form is submitted
  function handleSubmit() {
    if (!validateForm()) {
      return;
    }

    const newNotePath = `${os.homedir()}/notes/${name}.md`;

    fs.writeFileSync(newNotePath, body, { encoding: "utf8" });

    resetForm();

    popToRoot();

    showHUD("Note created ✨");
  }

  return (
    <Form
      navigationTitle="New note"
      actions={
        <ActionPanel>
          <Action title="Create note" onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" id="name" value={name} onChange={setName} placeholder="New note" error={nameError} />

      <Form.TextArea
        placeholder="This is my new note"
        info="Supports Markdown"
        onChange={setBody}
        error={bodyError}
        enableMarkdown
        value={body}
        title="Note"
        id="body"
      />
    </Form>
  );
}
