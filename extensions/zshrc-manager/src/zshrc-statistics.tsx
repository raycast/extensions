import type React from "react";
import { useState, useMemo } from "react";
import { Action, ActionPanel, List, Icon } from "@raycast/api";
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
import { getSectionImage } from "./lib/section-icons";
import { useZshrcLoader } from "./hooks/useZshrcLoader";
import { truncateValueMiddle } from "./utils/formatters";
import { calculateStatistics, hasContent, getTopEntries } from "./utils/statistics";
import { StatListItem } from "./components";
import {
  createSearchResults,
  filterResults,
  groupResultsByType,
  getTypeDisplayName,
  SearchResultListItem,
} from "./lib/search-results";
import { isSecretName, maskValue } from "./utils/secrets";

interface ZshrcStatisticsProps {
  searchBarAccessory?: React.ReactElement;
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

  const allResults = useMemo(() => createSearchResults(sections || []), [sections]);
  const filteredResults = useMemo(() => filterResults(allResults, searchText), [allResults, searchText]);
  const groupedResults = useMemo(() => groupResultsByType(filteredResults), [filteredResults]);
  const [revealedIds, setRevealedIds] = useState<ReadonlySet<string>>(new Set());

  const isSearching = searchText.trim().length > 0;

  const handleRefresh = () => {
    refresh();
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Masking is display-only: copy actions always receive the real value
  const displayExportValue = (variable: string, value: string): string =>
    isSecretName(variable) ? maskValue(value) : value;

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
                      icon={getSectionImage(section.label)}
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
          getItemSubtitle={(e) => displayExportValue(e.variable, e.value)}
          markdownContent={`
# Exports

**${exports.length}** environment variables

${getTopEntries(exports, 5)
  .map((exp) => `- **\`${exp.variable}\`** = \`${displayExportValue(exp.variable, exp.value)}\``)
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
          <SearchResultListItem
            key={result.id}
            result={result}
            refresh={handleRefresh}
            revealed={revealedIds.has(result.id)}
            onToggleReveal={() => toggleReveal(result.id)}
          />
        ))}
      </List.Section>
    ));
  };

  return (
    <List
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
