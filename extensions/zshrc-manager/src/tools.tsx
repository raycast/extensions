/**
 * Tools command: direct access to Health Check, Backup Manager and
 * History, each with its own root-search entry, hotkey slot and ranking —
 * without going through the home surface. The alias-collection catalogue
 * is discovery, not a tool: it lives on the home surface's Discover
 * section (and ⌘⇧L everywhere).
 */

import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useZshrcLoader } from "./hooks/useZshrcLoader";
import { useHealthReport, healthSummaryMarkdown } from "./hooks/useHealthReport";
import { MODERN_COLORS } from "./constants";
import HealthCheck from "./health-check";
import BackupManager from "./backup-manager";
import HistoryView from "./history-view";

interface Tool {
  id: string;
  title: string;
  icon: Icon;
  badge: { value: string; color: Color } | undefined;
  markdown: string;
  target: () => React.ReactElement;
}

export default function Tools() {
  const { sections, isLoading, refresh } = useZshrcLoader("Zshrc Tools");
  const health = useHealthReport(sections);
  const issueCount = health.issues.length;

  const tools: Tool[] = [
    {
      id: "health",
      title: "Health Check",
      icon: Icon.Heartbeat,
      badge: health.isChecking
        ? { value: "Checking…", color: Color.SecondaryText }
        : issueCount > 0
          ? {
              value: `${issueCount} ${issueCount === 1 ? "issue" : "issues"}`,
              color: health.errorIssues.length > 0 ? Color.Red : Color.Yellow,
            }
          : { value: "All clear", color: Color.Green },
      markdown: healthSummaryMarkdown(health),
      target: () => <HealthCheck />,
    },
    {
      id: "backup",
      title: "Backup Manager",
      icon: Icon.SaveDocument,
      badge: undefined,
      markdown:
        "## Backup Manager\n\nRestore or diff a previous version of your zshrc.\n\nEvery write this extension performs creates a backup first, so any change can be rolled back.",
      target: () => <BackupManager />,
    },
    {
      id: "history",
      title: "History",
      icon: Icon.ArrowCounterClockwise,
      badge: undefined,
      markdown:
        "## History\n\nUndo and redo recent changes made through this extension, with a timeline of what changed and when.",
      target: () => <HistoryView onRefresh={refresh} />,
    },
  ];

  return (
    <List navigationTitle="Zshrc Tools" searchBarPlaceholder="Search tools…" isLoading={isLoading} isShowingDetail>
      {tools.map((tool) => (
        <List.Item
          key={tool.id}
          title={tool.title}
          icon={{ source: tool.icon, tintColor: MODERN_COLORS.primary }}
          accessories={tool.badge ? [{ tag: tool.badge }] : []}
          detail={<List.Item.Detail markdown={tool.markdown} />}
          actions={
            <ActionPanel>
              <Action.Push title={`Open ${tool.title}`} icon={tool.icon} target={tool.target()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
