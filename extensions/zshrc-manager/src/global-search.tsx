/**
 * Global search across all zshrc entry types
 *
 * Provides unified search functionality across aliases, exports,
 * functions, plugins, sources, evals, and setopts.
 */

import { Action, ActionPanel, List, Icon, Color, Clipboard, showToast, Toast } from "@raycast/api";
import { useState, useMemo } from "react";
import { useZshrcLoader } from "./hooks/useZshrcLoader";
import { calculateStatistics, type ZshrcStatistics } from "./utils/statistics";
import { getZshrcPath } from "./lib/zsh";
import { truncateValueMiddle } from "./utils/formatters";
import { MODERN_COLORS } from "./constants";
import { shellQuoteSingle, shellQuoteDouble } from "./utils/shell-escape";

interface GlobalSearchProps {
  searchBarAccessory?: React.ReactElement;
}

/**
 * Unified search result item
 */
interface SearchResult {
  id: string;
  type: "alias" | "export" | "function" | "plugin" | "source" | "eval" | "setopt";
  title: string;
  subtitle: string;
  keywords: string[];
  icon: { source: Icon; tintColor: string };
  copyValue: string;
}

/**
 * Converts statistics to searchable results
 */
function createSearchResults(stats: ZshrcStatistics): SearchResult[] {
  const results: SearchResult[] = [];

  // Add aliases
  stats.aliases.forEach((alias, idx) => {
    results.push({
      id: `alias-${idx}`,
      type: "alias",
      title: alias.name,
      subtitle: alias.command,
      keywords: [alias.name.toLowerCase(), alias.command.toLowerCase(), "alias"],
      icon: { source: Icon.Terminal, tintColor: MODERN_COLORS.success },
      copyValue: `alias ${alias.name}='${shellQuoteSingle(alias.command)}'`,
    });
  });

  // Add exports
  stats.exports.forEach((exp, idx) => {
    results.push({
      id: `export-${idx}`,
      type: "export",
      title: exp.variable,
      subtitle: exp.value,
      keywords: [exp.variable.toLowerCase(), exp.value.toLowerCase(), "export", "env"],
      icon: { source: Icon.Upload, tintColor: MODERN_COLORS.primary },
      copyValue: `export ${exp.variable}="${shellQuoteDouble(exp.value)}"`,
    });
  });

  // Add functions
  stats.functions.forEach((func, idx) => {
    results.push({
      id: `function-${idx}`,
      type: "function",
      title: func.name,
      subtitle: "function",
      keywords: [func.name.toLowerCase(), "function", "func"],
      icon: { source: Icon.Code, tintColor: MODERN_COLORS.purple },
      copyValue: func.name,
    });
  });

  // Add plugins
  stats.plugins.forEach((plugin, idx) => {
    results.push({
      id: `plugin-${idx}`,
      type: "plugin",
      title: plugin.name,
      subtitle: "plugin",
      keywords: [plugin.name.toLowerCase(), "plugin"],
      icon: { source: Icon.Plug, tintColor: MODERN_COLORS.warning },
      copyValue: plugin.name,
    });
  });

  // Add sources
  stats.sources.forEach((source, idx) => {
    results.push({
      id: `source-${idx}`,
      type: "source",
      title: source.path,
      subtitle: "source",
      keywords: [source.path.toLowerCase(), "source"],
      icon: { source: Icon.Document, tintColor: Color.Orange },
      copyValue: `source ${source.path}`,
    });
  });

  // Add evals
  stats.evals.forEach((evalCmd, idx) => {
    results.push({
      id: `eval-${idx}`,
      type: "eval",
      title: truncateValueMiddle(evalCmd.command, 60),
      subtitle: "eval",
      keywords: [evalCmd.command.toLowerCase(), "eval"],
      icon: { source: Icon.Terminal, tintColor: MODERN_COLORS.error },
      copyValue: `eval "${shellQuoteDouble(evalCmd.command)}"`,
    });
  });

  // Add setopts
  stats.setopts.forEach((setopt, idx) => {
    results.push({
      id: `setopt-${idx}`,
      type: "setopt",
      title: setopt.option,
      subtitle: "setopt",
      keywords: [setopt.option.toLowerCase(), "setopt", "option"],
      icon: { source: Icon.Gear, tintColor: MODERN_COLORS.neutral },
      copyValue: `setopt ${setopt.option}`,
    });
  });

  return results;
}

/**
 * Filters results based on search text
 */
function filterResults(results: SearchResult[], searchText: string): SearchResult[] {
  if (!searchText.trim()) {
    return results;
  }

  const query = searchText.toLowerCase();
  return results.filter((result) => result.keywords.some((keyword) => keyword.includes(query)));
}

/**
 * Groups results by type for display
 */
function groupResultsByType(results: SearchResult[]): Map<string, SearchResult[]> {
  const groups = new Map<string, SearchResult[]>();

  results.forEach((result) => {
    const existing = groups.get(result.type) || [];
    existing.push(result);
    groups.set(result.type, existing);
  });

  return groups;
}

/**
 * Gets display name for result type
 */
function getTypeDisplayName(type: string): string {
  const names: Record<string, string> = {
    alias: "Aliases",
    export: "Exports",
    function: "Functions",
    plugin: "Plugins",
    source: "Sources",
    eval: "Evals",
    setopt: "Setopts",
  };
  return names[type] || type;
}

/**
 * Global search command for searching across all entry types
 */
export default function GlobalSearch({ searchBarAccessory }: GlobalSearchProps) {
  const { sections, isLoading, refresh } = useZshrcLoader("Search");
  const [searchText, setSearchText] = useState("");

  const stats = useMemo(() => (sections.length > 0 ? calculateStatistics(sections) : null), [sections]);

  const allResults = useMemo(() => (stats ? createSearchResults(stats) : []), [stats]);

  const filteredResults = useMemo(() => filterResults(allResults, searchText), [allResults, searchText]);

  const groupedResults = useMemo(() => groupResultsByType(filteredResults), [filteredResults]);

  const handleCopy = async (value: string) => {
    await Clipboard.copy(value);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to Clipboard",
      message: truncateValueMiddle(value, 40),
    });
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return null;
    }

    if (allResults.length === 0) {
      return (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Configuration Found"
          description="Your .zshrc file appears to be empty or couldn't be parsed."
        />
      );
    }

    if (searchText && filteredResults.length === 0) {
      return (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Results Found"
          description={`No entries matching "${searchText}"`}
        />
      );
    }

    return null;
  };

  return (
    <List
      navigationTitle="Global Search"
      searchBarPlaceholder="Search aliases, exports, functions, plugins..."
      searchBarAccessory={searchBarAccessory as List.Props["searchBarAccessory"]}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.Open title="Open Zshrc" target={getZshrcPath()} icon={Icon.Document} />
        </ActionPanel>
      }
    >
      {renderEmptyState()}

      {!searchText && allResults.length > 0 && (
        <List.Section title="Overview">
          <List.Item
            title="Start typing to search..."
            subtitle="Search across all aliases, exports, functions, and more"
            icon={{ source: Icon.MagnifyingGlass, tintColor: MODERN_COLORS.primary }}
            accessories={[{ text: `${allResults.length} entries` }]}
          />
        </List.Section>
      )}

      {Array.from(groupedResults.entries()).map(([type, results]) => (
        <List.Section
          key={type}
          title={getTypeDisplayName(type)}
          subtitle={results.length > 50 ? `${results.length} results (showing first 50)` : `${results.length} results`}
        >
          {results.slice(0, 50).map((result) => (
            <List.Item
              key={result.id}
              title={result.title}
              subtitle={result.subtitle !== result.type ? truncateValueMiddle(result.subtitle, 50) : ""}
              icon={result.icon}
              accessories={[{ tag: result.type }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Copy Definition"
                    icon={Icon.Clipboard}
                    onAction={() => handleCopy(result.copyValue)}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    title="Copy Name/Value"
                    icon={Icon.Clipboard}
                    onAction={() => handleCopy(result.title)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.Open title="Open Zshrc" target={getZshrcPath()} icon={Icon.Document} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={refresh}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
