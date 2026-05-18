import {
  List,
  Action,
  ActionPanel,
  getPreferenceValues,
  openCommandPreferences,
  environment,
  Color,
} from "@raycast/api";
import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";

interface Preferences {
  allowlist: string;
  targetLayout: string;
}

function getInputSourceIds(binaryPath: string): string[] {
  if (!existsSync(binaryPath)) return [];
  try {
    return execSync(`"${binaryPath}" list`, {
      encoding: "utf8",
      timeout: 3_000,
    })
      .trim()
      .split("\n")
      .filter(Boolean)
      .sort();
  } catch {
    return [];
  }
}

function getCurrentSourceId(binaryPath: string): string {
  if (!existsSync(binaryPath)) return "unknown";
  try {
    return execSync(`"${binaryPath}" current`, {
      encoding: "utf8",
      timeout: 3_000,
    }).trim();
  } catch {
    return "unknown";
  }
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const binaryPath = path.join(environment.assetsPath, "input-source");

  const allowlist = prefs.allowlist
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allSources = getInputSourceIds(binaryPath);
  const currentSourceId = getCurrentSourceId(binaryPath);

  const editAction = (
    <ActionPanel>
      <Action title="Edit in Preferences…" onAction={openCommandPreferences} />
    </ActionPanel>
  );

  return (
    <List navigationTitle="Configure Zyceh">
      <List.Section title="Target Layout">
        <List.Item
          title={prefs.targetLayout || "com.apple.keylayout.US"}
          subtitle="enforced when switching to a non-ignored app"
          accessories={[
            prefs.targetLayout === currentSourceId
              ? { tag: { value: "current", color: Color.Green } }
              : { text: "" },
          ]}
          actions={editAction}
        />
      </List.Section>

      <List.Section title={`Ignored Apps (${allowlist.length})`}>
        {allowlist.length === 0 ? (
          <List.Item
            title="No ignored apps"
            subtitle="all apps will use the target layout"
            actions={editAction}
          />
        ) : (
          allowlist.map((app) => (
            <List.Item
              key={app}
              title={app}
              subtitle="layout is never changed"
              accessories={[{ tag: { value: "ignored", color: Color.Yellow } }]}
              actions={editAction}
            />
          ))
        )}
      </List.Section>

      <List.Section title="Available Input Sources">
        {allSources.length === 0 ? (
          <List.Item
            title="Binary not found"
            subtitle="run: npm run build:swift"
          />
        ) : (
          allSources.map((id) => (
            <List.Item
              key={id}
              title={id}
              accessories={[
                id === currentSourceId
                  ? { tag: { value: "current", color: Color.Green } }
                  : id === prefs.targetLayout
                    ? { tag: { value: "target", color: Color.Blue } }
                    : {},
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Id" content={id} />
                  <Action
                    title="Edit Target in Preferences…"
                    onAction={openCommandPreferences}
                  />
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}
