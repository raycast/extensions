import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { ZSHRC_PATH } from "./lib/zsh";
import { parseSources } from "./utils/parsers";
import { truncateValueMiddle } from "./utils/formatters";
import { MODERN_COLORS } from "./constants";
import { useZshrcLoader } from "./hooks/useZshrcLoader";
import { useZshrcFilter } from "./hooks/useZshrcFilter";

/**
 * Sources management command for zshrc content
 */
export default function Sources() {
  const { sections, isLoading, refresh } = useZshrcLoader("Sources");

  const allSources = (sections || []).flatMap((section) =>
    parseSources(section.content).map((source) => ({
      ...source,
      section: section.label,
      sectionStartLine: section.startLine,
    })),
  );

  const { searchText, setSearchText, grouped } = useZshrcFilter(allSources, [
    "path",
    "section",
  ]);

  return (
    <List
      navigationTitle="Sources"
      searchBarPlaceholder="Search source commands..."
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
          title="Source Summary"
          subtitle={`${allSources.length} source commands found across ${sections.length} sections`}
          icon={{ source: Icon.Document, tintColor: MODERN_COLORS.primary }}
          detail={
            <List.Item.Detail
              markdown={`
# Source Summary

Your \`.zshrc\` file contains **${allSources.length} source commands** across **${sections.length} sections**.

## 📄 What are Source Commands?
Source commands load additional configuration files into your shell session. They're used to include external scripts, themes, completions, and other zsh configurations.

## 📊 Quick Stats
- **Total Sources**: ${allSources.length}
- **Sections with Sources**: ${Object.keys(grouped).length}
- **Common Types**: Themes, completions, external scripts

## 💡 Common Source Files
- **Themes**: \`~/.oh-my-zsh/themes/theme-name.zsh-theme\`
- **Completions**: \`/path/to/completion.zsh\`
- **External Scripts**: \`~/.config/zsh/custom.zsh\`
- **Plugin Files**: \`~/.oh-my-zsh/plugins/plugin/plugin.plugin.zsh\`

## ⚠️ Performance Note
Too many source commands can slow down shell startup. Consider using conditional sourcing or lazy loading.
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

      {Object.entries(grouped).map(([sectionName, sources]) => (
        <List.Section key={sectionName} title={sectionName}>
          {sources.map((source, index) => (
            <List.Item
              key={`${sectionName}-${source.path}-${index}`}
              title={truncateValueMiddle(source.path)}
              icon={{ source: Icon.Document, tintColor: MODERN_COLORS.primary }}
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
# Source: \`${source.path}\`

## 📄 Source Command
\`\`\`zsh
source ${source.path}
\`\`\`

## 📍 Location
- **Section**: ${source.section}
- **File**: ~/.zshrc
- **Section Start**: Line ${source.sectionStartLine}

## 💡 Source Types
- **Theme Files**: Zsh theme configurations
- **Completion Scripts**: Tab completion enhancements
- **External Scripts**: Custom zsh configurations
- **Plugin Files**: Plugin-specific configurations
- **Utility Scripts**: Helper functions and aliases

## 🔍 File Analysis
- **Path**: ${source.path}
- **Type**: ${source.path.includes("theme") ? "Theme" : source.path.includes("completion") ? "Completion" : "Configuration"}
- **Framework**: ${source.path.includes("oh-my-zsh") ? "Oh My Zsh" : "Custom"}

## ⚠️ Note
Source commands load external files. Make sure the referenced files exist and are accessible.
                  `}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Source Path"
                        text={truncateValueMiddle(source.path, 60)}
                        icon={{
                          source: Icon.Document,
                          tintColor: MODERN_COLORS.primary,
                        }}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Section"
                        text={source.section}
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
                        text={
                          source.path.includes("theme")
                            ? "Theme"
                            : source.path.includes("completion")
                              ? "Completion"
                              : "Configuration"
                        }
                        icon={{
                          source: Icon.Gear,
                          tintColor: MODERN_COLORS.warning,
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
        <List.Section title="No Sources Found">
          <List.Item
            title="No source commands match your search"
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
