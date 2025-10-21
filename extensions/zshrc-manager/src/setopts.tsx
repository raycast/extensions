import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { ZSHRC_PATH } from "./lib/zsh";
import { parseSetopts } from "./utils/parsers";
import { MODERN_COLORS } from "./constants";
import { useZshrcLoader } from "./hooks/useZshrcLoader";
import { useZshrcFilter } from "./hooks/useZshrcFilter";

/**
 * Setopts management command for zshrc content
 */
export default function Setopts() {
  const { sections, isLoading, refresh } = useZshrcLoader("Setopts");

  const allSetopts = (sections || []).flatMap((section) =>
    parseSetopts(section.content).map((setopt) => ({
      ...setopt,
      section: section.label,
      sectionStartLine: section.startLine,
    })),
  );

  const { searchText, setSearchText, grouped } = useZshrcFilter(allSetopts, [
    "option",
    "section",
  ]);

  return (
    <List
      navigationTitle="Setopts"
      searchBarPlaceholder="Search setopt options..."
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
          title="Setopt Summary"
          subtitle={`${allSetopts.length} setopts found across ${sections.length} sections`}
          icon={{ source: Icon.Gear, tintColor: MODERN_COLORS.success }}
          detail={
            <List.Item.Detail
              markdown={`
# Setopt Summary

Your \`.zshrc\` file contains **${allSetopts.length} setopts** across **${sections.length} sections**.

## ⚙️ What are Setopts?
Setopts are Zsh shell options that control the shell's behavior. They enable or disable various features like history management, job control, prompt expansion, and more.

## 📊 Quick Stats
- **Total Setopts**: ${allSetopts.length}
- **Sections with Setopts**: ${Object.keys(grouped).length}

## 💡 Common Setopts
- **HIST_EXPIRE_DUPS_FIRST**: Expire duplicates first in history
- **HIST_IGNORE_DUPS**: Don't store duplicate commands in history
- **HIST_IGNORE_SPACE**: Don't store commands starting with space
- **SHARE_HISTORY**: Share history across sessions
- **APPEND_HISTORY**: Append instead of overwriting history
- **EXTENDED_HISTORY**: Save timestamps in history
- **INC_APPEND_HISTORY**: Incrementally append to history

## 📚 Option Categories
- **History**: HIST_* options
- **Job Control**: Job control related options
- **Prompts**: Prompt expansion options
- **Expansion**: Variable/glob expansion options
- **Completion**: Completion behavior options
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

      {Object.entries(grouped).map(([sectionName, setopts]) => (
        <List.Section key={sectionName} title={sectionName}>
          {setopts.map((setopt, index) => (
            <List.Item
              key={`${sectionName}-${setopt.option}-${index}`}
              title={setopt.option}
              icon={{ source: Icon.Gear, tintColor: MODERN_COLORS.success }}
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
# Setopt: \`${setopt.option}\`

## ⚙️ Option Configuration
\`\`\`zsh
setopt ${setopt.option}
\`\`\`

## 📍 Location
- **Section**: ${setopt.section}
- **File**: ~/.zshrc
- **Section Start**: Line ${setopt.sectionStartLine}

## 💡 About This Option
- **Name**: ${setopt.option}
- **Type**: Zsh Shell Option
- **Purpose**: Configure shell behavior

## 📚 Option Information
- **HIST_* options**: Control command history behavior
- **setopt**: Enable an option
- **unsetopt**: Disable an option
- **set -o**: Alternative syntax for setting options

## 🔍 Common Related Options
- History: HIST_EXPIRE_DUPS_FIRST, HIST_IGNORE_DUPS, SHARE_HISTORY
- Jobs: NOTIFY, NO_HUP, BG_NICE
- Prompts: PROMPT_SUBST, TRANSIENT_RPROMPT
- Expansion: EXTENDED_GLOB, NOMATCH, NULL_GLOB

## 📖 Documentation
Run \`man zshopptions\` in your terminal to see detailed documentation on all available setopts.
                  `}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Option Name"
                        text={setopt.option}
                        icon={{
                          source: Icon.Gear,
                          tintColor: MODERN_COLORS.success,
                        }}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Section"
                        text={setopt.section}
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
                        text="Shell Option"
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
        <List.Section title="No Setopts Found">
          <List.Item
            title="No setopt options match your search"
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
