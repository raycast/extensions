import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { parseAliases } from "./utils/parsers";
import { truncateValueMiddle } from "./utils/formatters";
import EditAlias from "./edit-alias";
import { MODERN_COLORS } from "./constants";
import { ZSHRC_PATH } from "./lib/zsh";
import { ListViewController, type FilterableItem } from "./lib/list-view-controller";

/**
 * Alias item interface
 */
interface AliasItem extends FilterableItem {
  name: string;
  command: string;
}

/**
 * Aliases management command for zshrc content
 */
export default function Aliases() {
  return (
    <ListViewController<AliasItem>
      commandName="Aliases"
      navigationTitle="Aliases"
      searchPlaceholder="Search aliases..."
      icon={Icon.Terminal}
      tintColor={MODERN_COLORS.success}
      itemType="alias"
      itemTypePlural="aliases"
      parser={parseAliases}
      searchFields={["name", "command", "section"]}
      generateTitle={(alias) => alias.name}
      generateOverviewMarkdown={(_, allAliases, grouped) => `
# Alias Summary

Your \`.zshrc\` file contains **${allAliases.length} aliases** across **${allAliases.length > 0 ? Object.keys(grouped).length : 0} sections**.

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
      generateItemMarkdown={(alias) => `
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
      generateMetadata={(alias) => (
        <>
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
        </>
      )}
      generateOverviewActions={(_, refresh) => (
        <ActionPanel>
          <Action.Push title="Add New Alias" target={<EditAlias onSave={refresh} />} icon={Icon.Plus} />
          <Action.Open title="Open ~/.Zshrc" target={ZSHRC_PATH} icon={Icon.Document} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      )}
      generateItemActions={(alias, refresh) => (
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
          <Action.Push title="Add New Alias" target={<EditAlias onSave={refresh} />} icon={Icon.Plus} />
          <Action.Open title="Open ~/.Zshrc" target={ZSHRC_PATH} icon={Icon.Document} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      )}
    />
  );
}
