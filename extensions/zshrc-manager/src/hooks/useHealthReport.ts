/**
 * The full health report — issues, severity buckets, score and statistics —
 * computed once and shared by every surface that shows health state: the
 * Health Check view (the issues), the home surface and the Tools command
 * (badge + summary pane). One computation, so every badge and count agrees.
 */

import { useEffect, useMemo, useState } from "react";
import type { LogicalSection } from "../lib/parse-zshrc";
import { calculateStatistics, type ZshrcStatistics } from "../utils/statistics";
import {
  detectDuplicates,
  detectBrokenSources,
  type DuplicateResult,
  type BrokenSourceResult,
} from "../utils/validation";
import { MODERN_COLORS } from "../constants";

export interface HealthIssue {
  id: string;
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  category: "duplicates" | "broken" | "organization";
  details?: string;
}

export interface HealthScore {
  score: number;
  label: string;
  color: string;
}

export interface HealthReport {
  issues: HealthIssue[];
  errorIssues: HealthIssue[];
  warningIssues: HealthIssue[];
  infoIssues: HealthIssue[];
  score: HealthScore;
  stats: ZshrcStatistics | null;
  /** True while the async broken-source check is still running */
  isChecking: boolean;
}

/**
 * Creates health issues from validation results
 */
export function createHealthIssues(
  duplicateAliases: DuplicateResult,
  duplicateExports: DuplicateResult,
  brokenSources: BrokenSourceResult,
): HealthIssue[] {
  const issues: HealthIssue[] = [];

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
export function calculateHealthScore(issues: HealthIssue[]): HealthScore {
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

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
 * The health summary markdown rendered on the home surface's Health row and
 * the Tools command's Health Check pane — one builder, so they never drift.
 */
export function healthSummaryMarkdown(report: HealthReport): string {
  return [
    `# Health Score: ${report.score.score}/100`,
    ``,
    `**Status:** ${report.score.label}`,
    ``,
    `## Summary`,
    `- 🔴 **Errors:** ${report.errorIssues.length}`,
    `- 🟡 **Warnings:** ${report.warningIssues.length}`,
    `- 🔵 **Info:** ${report.infoIssues.length}`,
    ``,
    `## Statistics`,
    `- **Total Aliases:** ${report.stats?.aliases.length || 0}`,
    `- **Total Exports:** ${report.stats?.exports.length || 0}`,
    `- **Total Sources:** ${report.stats?.sources.length || 0}`,
    ``,
    report.isChecking
      ? "🔄 Still checking source files — counts may grow."
      : report.issues.length === 0
        ? "✅ No issues found! Your configuration looks healthy."
        : "Open Health Check to review each issue.",
  ].join("\n");
}

export function useHealthReport(sections: readonly LogicalSection[]): HealthReport {
  const [brokenSources, setBrokenSources] = useState<BrokenSourceResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const stats = useMemo(() => (sections.length > 0 ? calculateStatistics(sections) : null), [sections]);

  const duplicateAliases = useMemo(() => {
    if (!stats) return { duplicates: [], totalDuplicates: 0 };
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

  useEffect(() => {
    let cancelled = false;
    async function checkBrokenSources() {
      if (!stats || stats.sources.length === 0) {
        setBrokenSources({ brokenSources: [], totalBroken: 0 });
        setIsChecking(false);
        return;
      }
      setIsChecking(true);
      try {
        const result = await detectBrokenSources(stats.sources.map((s) => ({ path: s.path })));
        if (!cancelled) setBrokenSources(result);
      } catch (error) {
        console.error("Failed to detect broken sources:", error);
        if (!cancelled) setBrokenSources({ brokenSources: [], totalBroken: 0 });
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    }
    checkBrokenSources();
    return () => {
      cancelled = true;
    };
  }, [stats]);

  const issues = useMemo(() => {
    if (!brokenSources) return [];
    return createHealthIssues(duplicateAliases, duplicateExports, brokenSources);
  }, [duplicateAliases, duplicateExports, brokenSources]);

  const score = useMemo(() => calculateHealthScore(issues), [issues]);

  return {
    issues,
    errorIssues: issues.filter((i) => i.severity === "error"),
    warningIssues: issues.filter((i) => i.severity === "warning"),
    infoIssues: issues.filter((i) => i.severity === "info"),
    score,
    stats,
    isChecking,
  };
}
