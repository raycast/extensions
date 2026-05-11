import type React from "react";
import { useState, useMemo } from "react";
import { Action, ActionPanel, List, Icon, Color, Clipboard, showToast, Toast } from "@raycast/api";
import { getZshrcPath } from "./lib/zsh";
import Sections from "./sections";
import Aliases from "./aliases";
import Exports from "./exports";
import Functions from "./functions";
import Plugins from "./plugins";
import Sources from "./sources";
import Evals from "./evals";
import Setopts from "./setopts";
import { MODERN_COLORS } from "./constants";
import { getSectionIcon } from "./lib/section-icons";
import { useZshrcLoader } from "./hooks/useZshrcLoader";
import { truncateValueMiddle } from "./utils/formatters";
import { calculateStatistics, hasContent, getTopEntries, type ZshrcStatistics as StatsType } from "./utils/statistics";
import { StatListItem } from "./components";
import { shellQuoteSingle, shellQuoteDouble } from "./utils/shell-escape";

interface ZshrcStatisticsProps {
  searchBarAccessory?: React.ReactElement;
}

/**
 * Unified search result item for search functionality
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
 * Creates searchable results from statistics
 */
function createSearchResults(stats: StatsType): SearchResult[] {
  const results: SearchResult[] = [];

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
 * Statistics overview command for zshrc content
 *
 * Displays aggregated statistics across all configuration sections,
 * with quick links to manage individual entry types.
 */
export default function ZshrcStatistics({ searchBarAccessory }: ZshrcStatisticsProps = {}) {
  const { sections, isLoading, refresh, isFromCache } = useZshrcLoader("Statistics");
  const [searchText, setSearchText] = useState("");
  const stats = useMemo(() => (sections.length > 0 ? calculateStatistics(sections) : null), [sections]);

  const allResults = useMemo(() => (stats ? createSearchResults(stats) : []), [stats]);
  const filteredResults = useMemo(() => filterResults(allResults, searchText), [allResults, searchText]);
  const groupedResults = useMemo(() => groupResultsByType(filteredResults), [filteredResults]);

  const isSearching = searchText.trim().length > 0;

  const handleRefresh = () => {
    refresh();
  };

  const handleCopy = async (value: string) => {
    await Clipboard.copy(value);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to Clipboard",
      message: truncateValueMiddle(value, 40),
    });
  };

  const renderOverview = () => {
    if (!stats) {
      return (
        <List.Item
          title="Loading..."
          subtitle="Analyzing .zshrc"
          icon={{ source: Icon.Document, tintColor: MODERN_COLORS.primary }}
          accessories={[{ text: isFromCache ? "Cached" : "Reading", icon: Icon.Clock }]}
          detail={
            <List.Item.Detail
              markdown={`
# Loading Configuration

${isFromCache ? "⚠️ Using cached data" : "📖 Reading file..."}
              `}
            />
          }
        />
      );
    }

    // Check if zshrc is essentially empty
    const totalEntries =
      stats.aliases.length +
      stats.exports.length +
      stats.functions.length +
      stats.plugins.length +
      stats.sources.length +
      stats.evals.length +
      stats.setopts.length;

    if (totalEntries === 0 && stats.sectionCount <= 1) {
      return (
        <List.Item
          title="Empty Configuration"
          subtitle="Your .zshrc file appears to be empty"
          icon={{ source: Icon.Document, tintColor: MODERN_COLORS.neutral }}
          detail={
            <List.Item.Detail
              markdown={`
# Empty Configuration

Your \`.zshrc\` file doesn't contain any recognized configuration entries.

## Getting Started

You can add configuration by:
1. Opening your \`.zshrc\` file with the action below
2. Adding aliases, exports, or other shell configuration
3. Refreshing this view to see your changes

## Example Entries

\`\`\`zsh
# Aliases
alias ll='ls -la'
alias gs='git status'

# Exports
export EDITOR='vim'
export PATH="$HOME/bin:$PATH"
\`\`\`

Press ⌘R to refresh after making changes.
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
    }

    return null;
  };

  const renderStats = () => {
    if (!stats) return null;

    const { sectionCount, aliases, exports, functions, plugins, sources, evals, setopts } = stats;

    return (
      <>
        {/* Sections - special case with custom metadata */}
        <List.Item
          title="Sections"
          icon={{ source: Icon.Folder, tintColor: MODERN_COLORS.neutral }}
          accessories={[{ text: `${sectionCount}` }]}
          detail={
            <List.Item.Detail
              markdown={`
# Sections

**${sectionCount}** configuration blocks
              `}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Sections Found" text={`${sectionCount} total`} />
                  {getTopEntries(sections, 6).map((section, idx) => (
                    <List.Item.Detail.Metadata.Label
                      key={`section-${idx}`}
                      title={section.label}
                      text={`Lines ${section.startLine}-${section.endLine}`}
                      icon={{
                        source: getSectionIcon(section.label).icon,
                        tintColor: getSectionIcon(section.label).color,
                      }}
                    />
                  ))}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push title="View All Sections" target={<Sections />} icon={Icon.Folder} />
              <Action.Open title="Open ~/.Zshrc" target={getZshrcPath()} icon={Icon.Document} />
              <Action
                title="Refresh Statistics"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />

        {/* Aliases */}
        <StatListItem
          title="Aliases"
          icon={Icon.Terminal}
          tintColor={MODERN_COLORS.success}
          items={aliases}
          getItemLabel={(a) => a.name}
          getItemSubtitle={(a) => a.command}
          markdownContent={`
# Aliases

**${aliases.length}** command shortcuts

${getTopEntries(aliases, 5)
  .map((alias) => `- **\`${alias.name}\`** → \`${alias.command}\``)
  .join("\n")}
          `}
          viewAllTarget={<Aliases />}
          viewAllTitle="View All Aliases"
          onRefresh={handleRefresh}
        />

        {/* Exports */}
        <StatListItem
          title="Exports"
          icon={Icon.Upload}
          tintColor={MODERN_COLORS.primary}
          items={exports}
          getItemLabel={(e) => e.variable}
          getItemSubtitle={(e) => e.value}
          markdownContent={`
# Exports

**${exports.length}** environment variables

${getTopEntries(exports, 5)
  .map((exp) => `- **\`${exp.variable}\`** = \`${exp.value}\``)
  .join("\n")}
          `}
          viewAllTarget={<Exports />}
          viewAllTitle="View All Exports"
          onRefresh={handleRefresh}
        />

        {/* Functions */}
        {hasContent(stats, "functions") && (
          <StatListItem
            title="Functions"
            icon={Icon.Code}
            tintColor={MODERN_COLORS.purple}
            items={functions}
            getItemLabel={(f) => `${f.name}()`}
            markdownContent={`
# Function Statistics

## Functions
**Total:** ${functions.length} functions found

Functions are custom shell commands defined in your zshrc file.

### Functions Found
${getTopEntries(functions, 10)
  .map((func) => `- **\`${func.name}()\`**`)
  .join("\n")}
            `}
            viewAllTarget={<Functions />}
            viewAllTitle="View All Functions"
            onRefresh={handleRefresh}
          />
        )}

        {/* Plugins */}
        {hasContent(stats, "plugins") && (
          <StatListItem
            title="Plugins"
            icon={Icon.Plug}
            tintColor={MODERN_COLORS.warning}
            items={plugins}
            getItemLabel={(p) => p.name}
            markdownContent={`
# Plugin Statistics

## Plugins
**Total:** ${plugins.length} plugins found

Plugins extend zsh functionality with additional features and commands.

### Plugins Found
${getTopEntries(plugins, 10)
  .map((plugin) => `- **\`${plugin.name}\`**`)
  .join("\n")}
            `}
            viewAllTarget={<Plugins />}
            viewAllTitle="View All Plugins"
            onRefresh={handleRefresh}
          />
        )}

        {/* Sources */}
        {hasContent(stats, "sources") && (
          <StatListItem
            title="Sources"
            icon={Icon.Document}
            tintColor={MODERN_COLORS.primary}
            items={sources}
            getItemLabel={(s) => s.path}
            markdownContent={`
# Source Statistics

## Source Commands
**Total:** ${sources.length} source commands found

Source commands load additional configuration files into your shell session.

### Sources Found
${getTopEntries(sources, 10)
  .map((source) => `- **\`${source.path}\`**`)
  .join("\n")}
            `}
            viewAllTarget={<Sources />}
            viewAllTitle="View All Sources"
            onRefresh={handleRefresh}
          />
        )}

        {/* Evals */}
        {hasContent(stats, "evals") && (
          <StatListItem
            title="Evals"
            icon={Icon.Terminal}
            tintColor={MODERN_COLORS.error}
            items={evals}
            getItemLabel={(e) => truncateValueMiddle(e.command, 40)}
            markdownContent={`
# Eval Statistics

## Eval Commands
**Total:** ${evals.length} eval commands found

Eval commands execute shell code dynamically at runtime.

### Evals Found
${getTopEntries(evals, 10)
  .map((evalCmd) => `- **\`${truncateValueMiddle(evalCmd.command, 60)}\`**`)
  .join("\n")}
            `}
            viewAllTarget={<Evals />}
            viewAllTitle="View All Evals"
            onRefresh={handleRefresh}
          />
        )}

        {/* Setopts */}
        {hasContent(stats, "setopts") && (
          <StatListItem
            title="Setopts"
            icon={Icon.Gear}
            tintColor={MODERN_COLORS.neutral}
            items={setopts}
            getItemLabel={(s) => s.option}
            markdownContent={`
# Setopt Statistics

## Setopt Commands
**Total:** ${setopts.length} setopt commands found

Setopt commands configure zsh behavior and options.

### Setopts Found
${getTopEntries(setopts, 10)
  .map((setopt) => `- **\`${setopt.option}\`**`)
  .join("\n")}
            `}
            viewAllTarget={<Setopts />}
            viewAllTitle="View All Setopts"
            onRefresh={handleRefresh}
          />
        )}
      </>
    );
  };

  const renderSearchResults = () => {
    if (filteredResults.length === 0) {
      return (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Results Found"
          description={`No entries matching "${searchText}"`}
        />
      );
    }

    return Array.from(groupedResults.entries()).map(([type, results]) => (
      <List.Section key={type} title={getTypeDisplayName(type)} subtitle={`${results.length}`}>
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
        ))}
      </List.Section>
    ));
  };

  return (
    <List
      navigationTitle={`Zshrc Statistics${isFromCache ? " (Cached)" : ""}`}
      searchBarPlaceholder="Search aliases, exports, functions, plugins, or sections..."
      searchBarAccessory={searchBarAccessory as List.Props["searchBarAccessory"]}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      isShowingDetail={!isSearching}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={handleRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.Open title="Open ~/.Zshrc" target={getZshrcPath()} icon={Icon.Document} />
        </ActionPanel>
      }
    >
      {isSearching ? (
        renderSearchResults()
      ) : (
        <List.Section title="Overview">
          {renderOverview()}
          {renderStats()}
        </List.Section>
      )}
    </List>
  );
}
