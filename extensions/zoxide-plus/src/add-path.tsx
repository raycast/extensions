import { Action, ActionPanel, closeMainWindow, Form, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { existsSync, lstatSync } from "node:fs";
import { useEffect, useState } from "react";
import { getFinderTargetPath } from "./lib/finder";
import { addPath, zoxidePath } from "./lib/zoxide";

type Mode = "checking-finder" | "form" | "submitting";

export default function Command() {
  const [mode, setMode] = useState<Mode>("checking-finder");

  useEffect(() => {
    if (!zoxidePath) {
      setMode("form");
      return;
    }

    (async () => {
      const finderPath = await getFinderTargetPath();
      if (!finderPath) {
        setMode("form");
        return;
      }
      try {
        await addPath(finderPath);
        await closeMainWindow();
        await showHUD(`Added ${finderPath} to zoxide`);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to add path",
          message: error instanceof Error ? error.message : String(error),
        });
        setMode("form");
      }
    })();
  }, []);

  async function handleSubmit(values: { folders: string[] }) {
    const folder = values.folders[0];

    if (!folder || !existsSync(folder) || !lstatSync(folder).isDirectory()) {
      await showToast({ style: Toast.Style.Failure, title: "Pick a valid folder" });
      return;
    }

    setMode("submitting");
    try {
      await addPath(folder);
      await closeMainWindow();
      await showHUD(`Added ${folder} to zoxide`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add path",
        message: error instanceof Error ? error.message : String(error),
      });
      setMode("form");
    }
  }

  if (!zoxidePath) {
    return (
      <Form>
        <Form.Description text="zoxide not found. Install zoxide (e.g. `brew install zoxide`), or set a custom binary path in extension preferences." />
      </Form>
    );
  }

  return (
    <Form
      isLoading={mode !== "form"}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add to Zoxide" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folders"
        title="Folder"
        info="The folder to add to zoxide's index"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}
