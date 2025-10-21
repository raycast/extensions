import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { ZSHRC_PATH } from "./lib/zsh";
import { parsePlugins } from "./utils/parsers";
import { MODERN_COLORS } from "./constants";
import { useZshrcLoader } from "./hooks/useZshrcLoader";
import { useZshrcFilter } from "./hooks/useZshrcFilter";

/**
 * Plugins management command for zshrc content
 */
export default function Plugins() {
  const { sections, isLoading, refresh } = useZshrcLoader("Plugins");

  const allPlugins = (sections || []).flatMap((section) =>
    parsePlugins(section.content).map((plugin) => ({
      ...plugin,
      section: section.label,
      sectionStartLine: section.startLine,
    })),
  );

  const { searchText, setSearchText, grouped } = useZshrcFilter(allPlugins, [
    "name",
    "section",
  ]);

  // Get unique plugins (since they might appear in multiple sections)
  const uniquePlugins = Array.from(new Set(allPlugins.map((p) => p.name)));

  return (
    <List
      navigationTitle="Plugins"
      searchBarPlaceholder="Search plugins..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      isShowingDetail={true}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.Open
            title="Open ~/.Zshrc"
            target={ZSHRC_PATH}
            icon={Icon.Document}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Overview">
        <List.Item
          title="Plugin Summary"
          subtitle={`${uniquePlugins.length} unique plugins found across ${sections.length} sections`}
          icon={{ source: Icon.Box, tintColor: MODERN_COLORS.warning }}
          detail={
            <List.Item.Detail
              markdown={`
# Plugin Summary

Your \`.zshrc\` file contains **${uniquePlugins.length} unique plugins** across **${sections.length} sections**.

## 🔌 What are Plugins?
Plugins extend zsh functionality with additional features and commands. They're typically loaded through frameworks like Oh My Zsh, Zinit, or Antigen.

## 📊 Quick Stats
- **Unique Plugins**: ${uniquePlugins.length}
- **Total Plugin Entries**: ${allPlugins.length}
- **Sections with Plugins**: ${Object.keys(grouped).length}

## 💡 Common Plugins
- **git**: Git aliases and functions
- **docker**: Docker completion and aliases
- **node**: Node.js and npm utilities
- **python**: Python development tools
- **zsh-autosuggestions**: Command suggestions
- **zsh-syntax-highlighting**: Syntax highlighting

## ⚠️ Performance Note
Too many plugins can slow down shell startup. Consider using lazy loading or removing unused plugins.
              `}
            />
          }
          actions={
            <ActionPanel>
              <Action.Open
                title="Open ~/.Zshrc"
                target={ZSHRC_PATH}
                icon={Icon.Document}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {Object.entries(grouped).map(([sectionName, plugins]) => (
        <List.Section key={sectionName} title={sectionName}>
          {plugins.map((plugin, index) => (
            <List.Item
              key={`${sectionName}-${plugin.name}-${index}`}
              title={plugin.name}
              icon={{ source: Icon.Box, tintColor: MODERN_COLORS.warning }}
              accessories={[
                { text: sectionName },
                {
                  icon: {
                    source: Icon.Document,
                    tintColor: Color.SecondaryText,
                  },
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={`
# Plugin: \`${plugin.name}\`

## 🔌 Plugin Configuration
\`\`\`zsh
plugins=(${plugin.name} ...)
\`\`\`

## 📍 Location
- **Section**: ${plugin.section}
- **File**: ~/.zshrc
- **Section Start**: Line ${plugin.sectionStartLine}

## 💡 Plugin Information
- **Name**: ${plugin.name}
- **Type**: Zsh Plugin
- **Framework**: Oh My Zsh, Zinit, or Antigen

## 🔍 Common Plugin Features
- **Aliases**: Shortcuts for common commands
- **Functions**: Custom shell functions
- **Completions**: Tab completion enhancements
- **Themes**: Prompt customization
- **Utilities**: Development tools and helpers

## ⚠️ Note
Plugin functionality depends on your zsh plugin manager. Use the "Open ~/.Zshrc" action to view the complete plugin configuration.
                  `}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Plugin Name"
                        text={plugin.name}
                        icon={{
                          source: Icon.Box,
                          tintColor: MODERN_COLORS.warning,
                        }}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Section"
                        text={plugin.section}
                        icon={{
                          source: Icon.Folder,
                          tintColor: MODERN_COLORS.neutral,
                        }}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="File"
                        text="~/.zshrc"
                        icon={{
                          source: Icon.Document,
                          tintColor: MODERN_COLORS.neutral,
                        }}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Type"
                        text="Zsh Plugin"
                        icon={{
                          source: Icon.Gear,
                          tintColor: MODERN_COLORS.success,
                        }}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.Open
                    title="Open ~/.Zshrc"
                    target={ZSHRC_PATH}
                    icon={Icon.Document}
                  />
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

      {Object.keys(grouped).length === 0 && !isLoading && (
        <List.Section title="No Plugins Found">
          <List.Item
            title="No plugins match your search"
            subtitle="Try adjusting your search terms"
            icon={{
              source: Icon.MagnifyingGlass,
              tintColor: MODERN_COLORS.neutral,
            }}
            actions={
              <ActionPanel>
                <Action.Open
                  title="Open ~/.Zshrc"
                  target={ZSHRC_PATH}
                  icon={Icon.Document}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
