import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { ZSHRC_PATH } from "./lib/zsh";
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
import { calculateStatistics, hasContent, getTopEntries } from "./utils/statistics";

/**
 * Statistics overview command for zshrc content
 *
 * Displays aggregated statistics across all configuration sections,
 * with quick links to manage individual entry types.
 */
export default function ZshrcStatistics() {
  const { sections, isLoading, refresh, isFromCache } = useZshrcLoader("Statistics");
  const stats = sections.length > 0 ? calculateStatistics(sections) : null;

  const handleRefresh = () => {
    refresh();
  };

  const renderOverview = () => {
    if (!stats) {
      return (
        <List.Item
          title="📊 Loading..."
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
    return null;
  };

  const renderStats = () => {
    if (!stats) return null;

    const {
      sectionCount: sectionLength,
      aliases: allAliases,
      exports: allExports,
      functions: allFunctions,
      plugins: allPlugins,
      sources: allSources,
      evals: allEvals,
      setopts: allSetopts,
    } = stats;

    return (
      <>
        <List.Item
          title="Sections"
          icon={{ source: Icon.Folder, tintColor: MODERN_COLORS.neutral }}
          accessories={[{ text: `${sectionLength}` }]}
          detail={
            <List.Item.Detail
              markdown={`
# Sections

**${sectionLength}** configuration blocks
                `}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Sections Found" text={`${sectionLength} total`} />
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
              <Action.Open title="Open ~/.Zshrc" target={ZSHRC_PATH} icon={Icon.Document} />
              <Action
                title="Refresh Statistics"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Aliases"
          icon={{ source: Icon.Terminal, tintColor: MODERN_COLORS.success }}
          accessories={[{ text: `${allAliases.length}` }]}
          detail={
            <List.Item.Detail
              markdown={`
# Aliases

**${allAliases.length}** command shortcuts

${getTopEntries(allAliases, 5)
  .map((alias) => `- **\`${alias.name}\`** → \`${alias.command}\``)
  .join("\n")}
                `}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Aliases Found" text={`${allAliases.length} total`} />
                  {getTopEntries(allAliases, 6).map((alias, idx) => (
                    <List.Item.Detail.Metadata.Label
                      key={`alias-${idx}`}
                      title={alias.name}
                      text={truncateValueMiddle(alias.command)}
                      icon={{ source: Icon.Terminal, tintColor: Color.Green }}
                    />
                  ))}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push title="View All Aliases" target={<Aliases />} icon={Icon.Terminal} />
              <Action.Open title="Open ~/.Zshrc" target={ZSHRC_PATH} icon={Icon.Document} />
              <Action
                title="Refresh Statistics"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Exports"
          icon={{ source: Icon.Box, tintColor: MODERN_COLORS.primary }}
          accessories={[{ text: `${allExports.length}` }]}
          detail={
            <List.Item.Detail
              markdown={`
# Exports

**${allExports.length}** environment variables

${getTopEntries(allExports, 5)
  .map((exp) => `- **\`${exp.variable}\`** = \`${exp.value}\``)
  .join("\n")}
                `}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Exports Found" text={`${allExports.length} total`} />
                  {getTopEntries(allExports, 6).map((exp, idx) => (
                    <List.Item.Detail.Metadata.Label
                      key={`export-${idx}`}
                      title={exp.variable}
                      text={truncateValueMiddle(exp.value)}
                      icon={{ source: Icon.Box, tintColor: Color.Blue }}
                    />
                  ))}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push title="View All Exports" target={<Exports />} icon={Icon.Box} />
              <Action.Open title="Open ~/.Zshrc" target={ZSHRC_PATH} icon={Icon.Document} />
              <Action
                title="Refresh Statistics"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />

        {/* Additional Entry Type Statistics */}
        {hasContent(stats, "functions") && (
          <List.Item
            title="Functions"
            icon={{ source: Icon.Code, tintColor: MODERN_COLORS.primary }}
            accessories={[{ text: `${allFunctions.length}` }]}
            detail={
              <List.Item.Detail
                markdown={`
# Function Statistics

## 🔧 Functions
**Total:** ${allFunctions.length} functions found

Functions are custom shell commands defined in your zshrc file.

### Functions Found
${getTopEntries(allFunctions, 10)
  .map((func) => `- **\`${func.name}()\`**`)
  .join("\n")}
                  `}
              />
            }
            actions={
              <ActionPanel>
                <Action.Push title="View All Functions" target={<Functions />} icon={Icon.Code} />
                <Action.Open title="Open ~/.Zshrc" target={ZSHRC_PATH} icon={Icon.Document} />
                <Action
                  title="Refresh Statistics"
                  icon={Icon.ArrowClockwise}
                  onAction={handleRefresh}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        )}

        {hasContent(stats, "plugins") && (
          <List.Item
            title="Plugins"
            icon={{ source: Icon.Box, tintColor: MODERN_COLORS.warning }}
            accessories={[{ text: `${allPlugins.length}` }]}
            detail={
              <List.Item.Detail
                markdown={`
# Plugin Statistics

## 🔌 Plugins
**Total:** ${allPlugins.length} plugins found

Plugins extend zsh functionality with additional features and commands.

### Plugins Found
${getTopEntries(allPlugins, 10)
  .map((plugin) => `- **\`${plugin.name}\`**`)
  .join("\n")}
                  `}
              />
            }
            actions={
              <ActionPanel>
                <Action.Push title="View All Plugins" target={<Plugins />} icon={Icon.Box} />
                <Action.Open title="Open ~/.Zshrc" target={ZSHRC_PATH} icon={Icon.Document} />
                <Action
                  title="Refresh Statistics"
                  icon={Icon.ArrowClockwise}
                  onAction={handleRefresh}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        )}

        {hasContent(stats, "sources") && (
          <List.Item
            title="Sources"
            icon={{ source: Icon.Document, tintColor: MODERN_COLORS.primary }}
            accessories={[{ text: `${allSources.length}` }]}
            detail={
              <List.Item.Detail
                markdown={`
# Source Statistics

## 📄 Source Commands
**Total:** ${allSources.length} source commands found

Source commands load additional configuration files into your shell session.

### Sources Found
${getTopEntries(allSources, 10)
  .map((source) => `- **\`${source.path}\`**`)
  .join("\n")}
                  `}
              />
            }
            actions={
              <ActionPanel>
                <Action.Push title="View All Sources" target={<Sources />} icon={Icon.Document} />
                <Action.Open title="Open ~/.Zshrc" target={ZSHRC_PATH} icon={Icon.Document} />
                <Action
                  title="Refresh Statistics"
                  icon={Icon.ArrowClockwise}
                  onAction={handleRefresh}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        )}

        {hasContent(stats, "evals") && (
          <List.Item
            title="Evals"
            icon={{ source: Icon.Terminal, tintColor: MODERN_COLORS.error }}
            accessories={[{ text: `${allEvals.length}` }]}
            detail={
              <List.Item.Detail
                markdown={`
# Eval Statistics

## ⚡ Eval Commands
**Total:** ${allEvals.length} eval commands found

Eval commands execute shell code dynamically at runtime.

### Evals Found
${getTopEntries(allEvals, 10)
  .map((evalCmd) => `- **\`${truncateValueMiddle(evalCmd.command, 60)}\`**`)
  .join("\n")}
                  `}
              />
            }
            actions={
              <ActionPanel>
                <Action.Push title="View All Evals" target={<Evals />} icon={Icon.Terminal} />
                <Action.Open title="Open ~/.Zshrc" target={ZSHRC_PATH} icon={Icon.Document} />
                <Action
                  title="Refresh Statistics"
                  icon={Icon.ArrowClockwise}
                  onAction={handleRefresh}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        )}

        {hasContent(stats, "setopts") && (
          <List.Item
            title="Setopts"
            icon={{ source: Icon.Gear, tintColor: MODERN_COLORS.neutral }}
            accessories={[{ text: `${allSetopts.length}` }]}
            detail={
              <List.Item.Detail
                markdown={`
# Setopt Statistics

## ⚙️ Setopt Commands
**Total:** ${allSetopts.length} setopt commands found

Setopt commands configure zsh behavior and options.

### Setopts Found
${getTopEntries(allSetopts, 10)
  .map((setopt) => `- **\`${setopt.option}\`**`)
  .join("\n")}
                  `}
              />
            }
            actions={
              <ActionPanel>
                <Action.Push title="View All Setopts" target={<Setopts />} icon={Icon.Gear} />
                <Action.Open title="Open ~/.Zshrc" target={ZSHRC_PATH} icon={Icon.Document} />
                <Action
                  title="Refresh Statistics"
                  icon={Icon.ArrowClockwise}
                  onAction={handleRefresh}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        )}
      </>
    );
  };

  return (
    <List
      navigationTitle={`Zshrc Statistics${isFromCache ? " (Cached)" : ""}`}
      searchBarPlaceholder="Search aliases, exports, functions, plugins, or sections..."
      isLoading={isLoading}
      isShowingDetail={true}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={handleRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.Open title="Open ~/.Zshrc" target={ZSHRC_PATH} icon={Icon.Document} />
        </ActionPanel>
      }
    >
      <List.Section title="Overview">
        {renderOverview()}
        {renderStats()}
      </List.Section>
    </List>
  );
}
