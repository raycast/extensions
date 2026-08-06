/**
 * Health check dashboard for zshrc configuration
 *
 * Detects potential issues like:
 * - Duplicate aliases/exports
 * - Broken source paths
 * - Suggestions for organization
 */

import { Action, ActionPanel, List, Icon, Color, showToast, Toast } from "@raycast/api";
import { useZshrcLoader } from "./hooks/useZshrcLoader";
import { useHealthReport } from "./hooks/useHealthReport";
import { getZshrcPath } from "./lib/zsh";
import { MODERN_COLORS } from "./constants";

interface HealthCheckProps {
  searchBarAccessory?: React.ReactElement;
}

/**
 * Maps severity to icon and color
 */
function getSeverityStyle(severity: "error" | "warning" | "info"): { icon: Icon; color: string } {
  switch (severity) {
    case "error":
      return { icon: Icon.XMarkCircle, color: MODERN_COLORS.error };
    case "warning":
      return { icon: Icon.ExclamationMark, color: MODERN_COLORS.warning };
    case "info":
      return { icon: Icon.Info, color: MODERN_COLORS.primary };
  }
}

/**
 * Health check dashboard component
 */
export default function HealthCheck({ searchBarAccessory }: HealthCheckProps) {
  const { sections, isLoading, refresh } = useZshrcLoader("Health Check");
  const { issues, errorIssues, warningIssues, infoIssues, isChecking } = useHealthReport(sections);

  const handleRefresh = async () => {
    refresh();
    await showToast({
      style: Toast.Style.Animated,
      title: "Running health check...",
    });
  };

  return (
    <List
      navigationTitle="Health Check"
      searchBarPlaceholder="Filter Issues..."
      searchBarAccessory={searchBarAccessory as List.Props["searchBarAccessory"]}
      isLoading={isLoading || isChecking}
      isShowingDetail
      actions={
        <ActionPanel>
          <Action
            title="Run Health Check"
            icon={Icon.Heartbeat}
            onAction={handleRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.Open title="Open ~/.Zshrc" target={getZshrcPath()} icon={Icon.Document} />
        </ActionPanel>
      }
    >
      {/* The score/statistics summary lives on the home surface's Health
          row; this view is the issues themselves. */}
      {/* Error Issues */}
      {errorIssues.length > 0 && (
        <List.Section title="Errors" subtitle={`${errorIssues.length} issues require attention`}>
          {errorIssues.map((issue) => {
            const style = getSeverityStyle(issue.severity);
            return (
              <List.Item
                key={issue.id}
                title={issue.title}
                icon={{ source: style.icon, tintColor: style.color }}
                accessories={[{ tag: { value: issue.category, color: Color.Red } }]}
                detail={
                  <List.Item.Detail
                    markdown={`
# ${issue.title}

**Severity:** Error
**Category:** ${issue.category}

## Description
${issue.description}

## Details
${issue.details || "No additional details."}

## Recommendation
Fix this issue to prevent errors when starting your shell.
                    `}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.Open title="Open ~/.Zshrc" target={getZshrcPath()} icon={Icon.Document} />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={handleRefresh}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {/* Warning Issues */}
      {warningIssues.length > 0 && (
        <List.Section title="Warnings" subtitle={`${warningIssues.length} potential issues`}>
          {warningIssues.map((issue) => {
            const style = getSeverityStyle(issue.severity);
            return (
              <List.Item
                key={issue.id}
                title={issue.title}
                icon={{ source: style.icon, tintColor: style.color }}
                accessories={[{ tag: { value: issue.category, color: Color.Orange } }]}
                detail={
                  <List.Item.Detail
                    markdown={`
# ${issue.title}

**Severity:** Warning
**Category:** ${issue.category}

## Description
${issue.description}

## Details
${issue.details || "No additional details."}

## Recommendation
Consider reviewing this configuration to avoid confusion.
                    `}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.Open title="Open ~/.Zshrc" target={getZshrcPath()} icon={Icon.Document} />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={handleRefresh}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {/* Info Issues */}
      {infoIssues.length > 0 && (
        <List.Section title="Information" subtitle={`${infoIssues.length} notes`}>
          {infoIssues.map((issue) => {
            const style = getSeverityStyle(issue.severity);
            return (
              <List.Item
                key={issue.id}
                title={issue.title}
                icon={{ source: style.icon, tintColor: style.color }}
                accessories={[{ tag: { value: issue.category, color: Color.Blue } }]}
                detail={
                  <List.Item.Detail
                    markdown={`
# ${issue.title}

**Severity:** Info
**Category:** ${issue.category}

## Description
${issue.description}

## Details
${issue.details || "No additional details."}

## Note
This is informational and may be intentional.
                    `}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.Open title="Open ~/.Zshrc" target={getZshrcPath()} icon={Icon.Document} />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={handleRefresh}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {/* No Issues */}
      {issues.length === 0 && !isLoading && !isChecking && (
        <List.Section title="No Issues Found">
          <List.Item
            title="Your configuration looks healthy!"
            icon={{ source: Icon.CheckCircle, tintColor: MODERN_COLORS.success }}
            detail={
              <List.Item.Detail
                markdown={`
# ✅ All Clear!

Your \`.zshrc\` configuration passed all health checks:

- ✅ No duplicate aliases
- ✅ No duplicate exports
- ✅ No broken source paths

Keep up the good work!
                `}
              />
            }
          />
        </List.Section>
      )}
    </List>
  );
}
