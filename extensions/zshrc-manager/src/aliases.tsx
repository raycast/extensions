import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import type { ReactElement } from "react";
import { parseAliases } from "./utils/parsers";
import { truncateValueMiddle } from "./utils/formatters";
import EditAlias, { aliasConfig } from "./edit-alias";
import { MODERN_COLORS } from "./constants";
import { getZshrcPath } from "./lib/zsh";
import { ListViewController, type FilterableItem } from "./lib/list-view-controller";
import { deleteItem } from "./lib/delete-item";

/**
 * Alias item interface
 */
interface AliasItem extends FilterableItem {
  name: string;
  command: string;
}

interface AliasesProps {
  searchBarAccessory?: ReactElement | null;
}

/**
 * Aliases management command for zshrc content
 */
export default function Aliases({ searchBarAccessory }: AliasesProps) {
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
      searchBarAccessory={searchBarAccessory}
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
      )}
      generateOverviewActions={(_, refresh) => (
        <ActionPanel>
          <Action.Push
            title="Add New Alias"
            target={<EditAlias onSave={refresh} />}
            shortcut={Keyboard.Shortcut.Common.New}
            icon={Icon.Plus}
          />
          <Action.Open title="Open ~/.Zshrc" target={getZshrcPath()} icon={Icon.Document} />
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
          <Action
            title="Delete Alias"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={async () => {
              try {
                await deleteItem(alias.name, aliasConfig);
                refresh();
              } catch {
                // Error already shown in deleteItem
              }
            }}
          />
          <Action.Push
            title="Add New Alias"
            target={<EditAlias onSave={refresh} />}
            shortcut={Keyboard.Shortcut.Common.New}
            icon={Icon.Plus}
          />
          <Action.Open title="Open ~/.Zshrc" target={getZshrcPath()} icon={Icon.Document} />
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
