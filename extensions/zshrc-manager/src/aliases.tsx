import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { ZSHRC_PATH } from "./lib/zsh";
import { parseAliases } from "./utils/parsers";
import { truncateValueMiddle } from "./utils/formatters";
import EditAlias from "./edit-alias";
import { MODERN_COLORS } from "./constants";
import { useZshrcLoader } from "./hooks/useZshrcLoader";
import { useZshrcFilter } from "./hooks/useZshrcFilter";

/**
 * Aliases management command for zshrc content
 */
export default function Aliases() {
  const { sections, isLoading, refresh } = useZshrcLoader("Aliases");

  const allAliases = (sections || []).flatMap((section) =>
    parseAliases(section.content).map((alias) => ({
      ...alias,
      section: section.label,
      sectionStartLine: section.startLine,
    })),
  );

  const { searchText, setSearchText, grouped } = useZshrcFilter(allAliases, [
    "name",
    "command",
    "section",
  ]);

  return (
    <List
      navigationTitle="Aliases"
      searchBarPlaceholder="Search aliases..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      isShowingDetail={true}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add New Alias"
            target={<EditAlias onSave={refresh} />}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
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
          title="Alias Summary"
          subtitle={`${allAliases.length} aliases found across ${sections.length} sections`}
          icon={{ source: Icon.Terminal, tintColor: MODERN_COLORS.success }}
          detail={
            <List.Item.Detail
              markdown={`
# Alias Summary

Your \`.zshrc\` file contains **${allAliases.length} aliases** across **${sections.length} sections**.

## 🖥️ What are Aliases?
Aliases are shortcuts that allow you to run longer commands with shorter names. They make your terminal workflow more efficient by reducing typing.

## 📊 Quick Stats
- **Total Aliases**: ${allAliases.length}
- **Sections with Aliases**: ${Object.keys(grouped).length}
- **Most Common Pattern**: ${allAliases.length > 0 ? "Command shortcuts" : "None found"}

## 💡 Tips
- Use descriptive names for your aliases
- Group related aliases in the same section
- Consider using functions for more complex shortcuts
              `}
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Add New Alias"
                target={<EditAlias onSave={refresh} />}
                icon={Icon.Plus}
              />
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

      {Object.entries(grouped).map(([sectionName, aliases]) => (
        <List.Section key={sectionName} title={sectionName}>
          {aliases.map((alias, index) => (
            <List.Item
              key={`${sectionName}-${alias.name}-${index}`}
              title={alias.name}
              icon={{ source: Icon.Terminal, tintColor: MODERN_COLORS.success }}
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
# Alias: \`${alias.name}\`

## 🖥️ Command
\`\`\`bash
${alias.command}
\`\`\`

## 📍 Location
- **Section**: ${alias.section}
- **File**: ~/.zshrc
- **Section Start**: Line ${alias.sectionStartLine}

## 💡 Usage
Type \`${alias.name}\` in your terminal to execute:
\`\`\`bash
${alias.command}
\`\`\`

## 🔧 Management
Use the actions below to edit or manage this alias.
                  `}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Alias Name"
                        text={alias.name}
                        icon={{
                          source: Icon.Terminal,
                          tintColor: MODERN_COLORS.success,
                        }}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Command"
                        text={truncateValueMiddle(alias.command, 60)}
                        icon={{
                          source: Icon.Code,
                          tintColor: MODERN_COLORS.primary,
                        }}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Section"
                        text={alias.section}
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
                  <Action.Push
                    title="Edit Alias"
                    target={
                      <EditAlias
                        existingName={alias.name}
                        existingCommand={alias.command}
                        sectionLabel={alias.section}
                        onSave={refresh}
                      />
                    }
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                  <Action.Push
                    title="Add New Alias"
                    target={<EditAlias onSave={refresh} />}
                    icon={Icon.Plus}
                  />
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
        <List.Section title="No Aliases Found">
          <List.Item
            title="No aliases match your search"
            subtitle="Try adjusting your search terms"
            icon={{
              source: Icon.MagnifyingGlass,
              tintColor: MODERN_COLORS.neutral,
            }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add New Alias"
                  target={<EditAlias onSave={refresh} />}
                  icon={Icon.Plus}
                />
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
