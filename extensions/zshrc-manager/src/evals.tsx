import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { ZSHRC_PATH } from "./lib/zsh";
import { parseEvals } from "./utils/parsers";
import { truncateValueMiddle } from "./utils/formatters";
import { MODERN_COLORS } from "./constants";
import { useZshrcLoader } from "./hooks/useZshrcLoader";
import { useZshrcFilter } from "./hooks/useZshrcFilter";

/**
 * Evals management command for zshrc content
 */
export default function Evals() {
  const { sections, isLoading, refresh } = useZshrcLoader("Evals");

  const allEvals = (sections || []).flatMap((section) =>
    parseEvals(section.content).map((evalItem) => ({
      ...evalItem,
      section: section.label,
      sectionStartLine: section.startLine,
    })),
  );

  const { searchText, setSearchText, grouped } = useZshrcFilter(allEvals, [
    "command",
    "section",
  ]);

  return (
    <List
      navigationTitle="Evals"
      searchBarPlaceholder="Search eval commands..."
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
          title="Eval Summary"
          subtitle={`${allEvals.length} eval commands found across ${sections.length} sections`}
          icon={{ source: Icon.Code, tintColor: MODERN_COLORS.warning }}
          detail={
            <List.Item.Detail
              markdown={`
# Eval Summary

Your \`.zshrc\` file contains **${allEvals.length} eval commands** across **${sections.length} sections**.

## ⚡ What are Eval Commands?
Eval commands execute code dynamically, typically used to initialize tools or runtimes. Common examples include \`eval "$(command init -)"\` patterns for tools like rbenv, nvm, or pyenv.

## 📊 Quick Stats
- **Total Evals**: ${allEvals.length}
- **Sections with Evals**: ${Object.keys(grouped).length}
- **Common Tools**: rbenv, nvm, pyenv, direnv

## 💡 Common Eval Patterns
- **Version Managers**: rbenv, nvm, pyenv, sdkman
- **Shell Initializers**: direnv, starship, thefuck
- **Development Tools**: docker, kubectl
- **Shell Utilities**: Various CLI tools

## ⚠️ Performance Note
Each eval command can add overhead to shell startup. Consider lazy loading or conditional initialization.
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

      {Object.entries(grouped).map(([sectionName, evals]) => (
        <List.Section key={sectionName} title={sectionName}>
          {evals.map((evalItem, index) => (
            <List.Item
              key={`${sectionName}-${evalItem.command}-${index}`}
              title={truncateValueMiddle(evalItem.command)}
              icon={{ source: Icon.Code, tintColor: MODERN_COLORS.warning }}
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
# Eval: \`${truncateValueMiddle(evalItem.command, 80)}\`

## ⚡ Eval Command
\`\`\`zsh
eval "${evalItem.command}"
\`\`\`

## 📍 Location
- **Section**: ${evalItem.section}
- **File**: ~/.zshrc
- **Section Start**: Line ${evalItem.sectionStartLine}

## 💡 Eval Information
- **Purpose**: Dynamic code execution during shell initialization
- **Common Uses**: Tool initialization and version management

## 🔍 Common Eval Tools
- **rbenv**: \`eval "$(rbenv init -)"\`
- **nvm**: \`eval "$(nvm_command)"\`
- **pyenv**: \`eval "$(pyenv init -)"\`
- **direnv**: \`eval "$(direnv hook zsh)"\`

## ⚠️ Performance Impact
Eval commands execute during shell startup. Multiple evals can increase startup time. Consider lazy loading alternatives.
                  `}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Command"
                        text={truncateValueMiddle(evalItem.command, 60)}
                        icon={{
                          source: Icon.Code,
                          tintColor: MODERN_COLORS.warning,
                        }}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Section"
                        text={evalItem.section}
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
        <List.Section title="No Evals Found">
          <List.Item
            title="No eval commands match your search"
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
