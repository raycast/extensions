import { Action, ActionPanel, Application, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { homedir } from "node:os";
import { basename } from "node:path";
import { useState } from "react";
import { addPath, zoxidePath } from "./lib/zoxide";

interface ExtensionPreferences {
  terminal: Application;
  editor: Application;
}

export default function Command() {
  const { terminal, editor } = getPreferenceValues<ExtensionPreferences>();
  const [searchText, setSearchText] = useState("");

  const args = ["query", "-l", "-s", ...(searchText ? [searchText] : [])];
  const { isLoading, data, revalidate } = useExec(zoxidePath ?? "", args, {
    execute: Boolean(zoxidePath),
    keepPreviousData: true,
    parseOutput: ({ stdout }) => parseScoredOutput(stdout),
    failureToastOptions: { title: "zoxide query failed" },
  });

  const entries = data ?? [];

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your zoxide directory index..."
      throttle
    >
      {!zoxidePath ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="zoxide not found"
          description="Install with: brew install zoxide"
        />
      ) : (
        <List.Section title="Results" subtitle={entries.length.toString()}>
          {entries.map((entry) => (
            <PathItem
              key={entry.path}
              path={entry.path}
              score={entry.score}
              terminal={terminal}
              editor={editor}
              onBoost={revalidate}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

interface ZoxideEntry {
  path: string;
  score: string;
}

function parseScoredOutput(stdout: string): ZoxideEntry[] {
  return stdout
    .split("\n")
    .map((line) => {
      const match = line.match(/^\s*(\S+)\s+(.+)$/);
      return match ? { score: match[1], path: match[2] } : null;
    })
    .filter((entry): entry is ZoxideEntry => entry !== null);
}

function PathItem({
  path,
  score,
  terminal,
  editor,
  onBoost,
}: {
  path: string;
  score: string;
  terminal: Application;
  editor: Application;
  onBoost: () => void;
}) {
  const home = homedir();
  const subtitle = path.startsWith(home) ? path.replace(home, "~") : path;

  async function handleBoost() {
    try {
      await addPath(path);
      await showToast({ style: Toast.Style.Success, title: "Boosted in Zoxide", message: basename(path) });
      onBoost();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to boost",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List.Item
      icon={Icon.Folder}
      title={basename(path)}
      subtitle={subtitle}
      accessories={[{ tag: score, tooltip: `Zoxide score: ${score}` }]}
      actions={
        <ActionPanel>
          <Action.Open title="Open in Finder" target={path} icon={Icon.Finder} />
          <Action.Open
            title={`Open in ${terminal.name}`}
            target={path}
            application={terminal}
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action.Open
            title={`Open in ${editor.name}`}
            target={path}
            application={editor}
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
          />
          <Action.ShowInFinder path={path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
          <Action
            title="Boost in Zoxide"
            icon={Icon.ArrowUp}
            onAction={handleBoost}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
          <Action.CopyToClipboard title="Copy Path" content={path} shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
    />
  );
}
