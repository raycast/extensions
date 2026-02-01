/**
 * Health check dashboard for zshrc configuration
 *
 * Detects potential issues like:
 * - Duplicate aliases/exports
 * - Broken source paths
 * - Suggestions for organization
 */

import { Action, ActionPanel, List, Icon, Color, showToast, Toast } from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { useZshrcLoader } from "./hooks/useZshrcLoader";
import { calculateStatistics } from "./utils/statistics";
import { getZshrcPath } from "./lib/zsh";
import {
  detectDuplicates,
  detectBrokenSources,
  type DuplicateResult,
  type BrokenSourceResult,
} from "./utils/validation";
import { MODERN_COLORS } from "./constants";

interface HealthCheckProps {
  searchBarAccessory?: React.ReactElement;
}

interface HealthIssue {
  id: string;
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  category: "duplicates" | "broken" | "organization";
  details?: string;
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
 * Creates health issues from validation results
 */
function createHealthIssues(
  duplicateAliases: DuplicateResult,
  duplicateExports: DuplicateResult,
  brokenSources: BrokenSourceResult,
): HealthIssue[] {
  const issues: HealthIssue[] = [];

  // Duplicate aliases
  duplicateAliases.duplicates.forEach((dup) => {
    issues.push({
      id: `dup-alias-${dup.name}`,
      severity: "warning",
      title: `Duplicate alias: ${dup.name}`,
      description: `Defined ${dup.count} times in: ${dup.sections.join(", ")}`,
      category: "duplicates",
      details: `The alias "${dup.name}" is defined ${dup.count} times. Only the last definition will be active.`,
    });
  });

  // Duplicate exports
  duplicateExports.duplicates.forEach((dup) => {
    issues.push({
      id: `dup-export-${dup.name}`,
      severity: "warning",
      title: `Duplicate export: ${dup.name}`,
      description: `Defined ${dup.count} times in: ${dup.sections.join(", ")}`,
      category: "duplicates",
      details: `The export "${dup.name}" is defined ${dup.count} times. Only the last value will be used.`,
    });
  });

  // Broken sources
  brokenSources.brokenSources.forEach((broken) => {
    issues.push({
      id: `broken-${broken.path}`,
      severity: "error",
      title: `Missing source file`,
      description: broken.path,
      category: "broken",
      details: `The file "${broken.expandedPath}" does not exist or is not readable. This will cause an error when the shell starts.`,
    });
  });

  return issues;
}

/**
 * Calculates overall health score
 */
function calculateHealthScore(issues: HealthIssue[]): { score: number; label: string; color: string } {
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  // Deduct points for issues
  let score = 100;
  score -= errorCount * 20;
  score -= warningCount * 5;
  score = Math.max(0, score);

  let label: string;
  let color: string;

  if (score >= 90) {
    label = "Excellent";
    color = MODERN_COLORS.success;
  } else if (score >= 70) {
    label = "Good";
    color = MODERN_COLORS.primary;
  } else if (score >= 50) {
    label = "Fair";
    color = MODERN_COLORS.warning;
  } else {
    label = "Needs Attention";
    color = MODERN_COLORS.error;
  }

  return { score, label, color };
}

/**
 * Health check dashboard component
 */
export default function HealthCheck({ searchBarAccessory }: HealthCheckProps) {
  const { sections, isLoading, refresh } = useZshrcLoader("Health Check");
  const [brokenSources, setBrokenSources] = useState<BrokenSourceResult | null>(null);
  const [isCheckingBroken, setIsCheckingBroken] = useState(false);

  const stats = useMemo(() => (sections.length > 0 ? calculateStatistics(sections) : null), [sections]);

  // Synchronous checks - preserve original section context from parsed data
  const duplicateAliases = useMemo(() => {
    if (!stats) return { duplicates: [], totalDuplicates: 0 };
    // Use section info from the parsed sections if available
    const aliasesWithSection = sections.flatMap((section) =>
      stats.aliases
        .filter((a) => section.content.includes(`alias ${a.name}=`))
        .map((a) => ({ ...a, section: section.label })),
    );
    return detectDuplicates(
      aliasesWithSection.length > 0 ? aliasesWithSection : stats.aliases.map((a) => ({ ...a, section: "zshrc" })),
      "name",
    );
  }, [stats, sections]);

  const duplicateExports = useMemo(() => {
    if (!stats) return { duplicates: [], totalDuplicates: 0 };
    // Use section info from the parsed sections if available
    const exportsWithSection = sections.flatMap((section) =>
      stats.exports
        .filter((e) => section.content.includes(`export ${e.variable}=`) || section.content.includes(`${e.variable}=`))
        .map((e) => ({ ...e, section: section.label })),
    );
    return detectDuplicates(
      exportsWithSection.length > 0 ? exportsWithSection : stats.exports.map((e) => ({ ...e, section: "zshrc" })),
      "variable",
    );
  }, [stats, sections]);

  // Async check for broken sources
  useEffect(() => {
    async function checkBrokenSources() {
      if (!stats || stats.sources.length === 0) {
        setBrokenSources({ brokenSources: [], totalBroken: 0 });
        return;
      }

      setIsCheckingBroken(true);
      try {
        const result = await detectBrokenSources(stats.sources.map((s) => ({ path: s.path })));
        setBrokenSources(result);
      } catch (error) {
        // Log the error for debugging purposes
        console.error("Failed to detect broken sources:", error);
        setBrokenSources({ brokenSources: [], totalBroken: 0 });
      } finally {
        setIsCheckingBroken(false);
      }
    }

    checkBrokenSources();
  }, [stats]);

  const issues = useMemo(() => {
    if (!brokenSources) return [];
    return createHealthIssues(duplicateAliases, duplicateExports, brokenSources);
  }, [duplicateAliases, duplicateExports, brokenSources]);

  const healthScore = useMemo(() => calculateHealthScore(issues), [issues]);

  const errorIssues = issues.filter((i) => i.severity === "error");
  const warningIssues = issues.filter((i) => i.severity === "warning");
  const infoIssues = issues.filter((i) => i.severity === "info");

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
      isLoading={isLoading || isCheckingBroken}
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
      {/* Health Score Summary */}
      <List.Section title="Summary">
        <List.Item
          title="Health Score"
          subtitle={`${healthScore.score}/100 - ${healthScore.label}`}
          icon={{ source: Icon.Heartbeat, tintColor: healthScore.color }}
          accessories={[
            { text: `${errorIssues.length} errors`, icon: errorIssues.length > 0 ? Icon.XMarkCircle : undefined },
            {
              text: `${warningIssues.length} warnings`,
              icon: warningIssues.length > 0 ? Icon.ExclamationMark : undefined,
            },
          ]}
          detail={
            <List.Item.Detail
              markdown={`
# Health Score: ${healthScore.score}/100

**Status:** ${healthScore.label}

## Summary
- 🔴 **Errors:** ${errorIssues.length}
- 🟡 **Warnings:** ${warningIssues.length}
- 🔵 **Info:** ${infoIssues.length}

## Statistics
- **Total Aliases:** ${stats?.aliases.length || 0}
- **Total Exports:** ${stats?.exports.length || 0}
- **Total Sources:** ${stats?.sources.length || 0}

${issues.length === 0 ? "✅ No issues found! Your configuration looks healthy." : ""}
              `}
            />
          }
        />
      </List.Section>

      {/* Error Issues */}
      {errorIssues.length > 0 && (
        <List.Section title="Errors" subtitle={`${errorIssues.length} issues require attention`}>
          {errorIssues.map((issue) => {
            const style = getSeverityStyle(issue.severity);
            return (
              <List.Item
                key={issue.id}
                title={issue.title}
                subtitle={issue.description}
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
                subtitle={issue.description}
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
                subtitle={issue.description}
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
      {issues.length === 0 && !isLoading && !isCheckingBroken && (
        <List.Section title="No Issues Found">
          <List.Item
            title="Your configuration looks healthy!"
            subtitle="No duplicates, conflicts, or broken sources detected"
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
