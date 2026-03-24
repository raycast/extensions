import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import type { ReactElement } from "react";
import { parseAliases } from "./utils/parsers";
import { truncateValueMiddle } from "./utils/formatters";
import EditAlias, { aliasConfig } from "./edit-alias";
import { MODERN_COLORS } from "./constants";
import { ListViewController, type FilterableItem, type ItemWarning } from "./lib/list-view-controller";
import { deleteItem } from "./lib/delete-item";
import { SharedActionsSection } from "./lib/shared-actions";
import BrowseAliases from "./browse-aliases";

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
 * Warning generator for aliases
 * Detects duplicate alias definitions across sections
 */
function generateAliasWarning(alias: AliasItem, allAliases: AliasItem[]): ItemWarning | null {
  // Check for duplicates
  const duplicates = allAliases.filter((a) => a.name === alias.name);
  if (duplicates.length > 1) {
    const otherSections = duplicates
      .filter((d) => d !== alias)
      .map((d) => d.section)
      .join(", ");
    return {
      type: "duplicate",
      message: `Duplicate alias: also defined in ${otherSections}`,
      icon: Icon.ExclamationMark,
      color: Color.Yellow,
    };
  }

  return null;
}

/**
 * Aliases management command for zshrc content
 */
export default function Aliases({ searchBarAccessory }: AliasesProps) {
  // Function to generate the browse section with access to refresh callback
  const getBrowseAliasesSection = (refresh: () => void) => (
    <List.Section title="Discover">
      <List.Item
        title="Alias Collections"
        icon={{ source: Icon.Book, tintColor: MODERN_COLORS.primary }}
        accessories={[{ icon: Icon.ChevronRight }]}
        detail={
          <List.Item.Detail
            markdown={`
# Browse Alias Collections

Discover curated alias collections from the community.

## Available Collections
- **Git Aliases** - Shortcuts for common git commands
- **Docker Aliases** - Container management shortcuts
- **Kubernetes Aliases** - kubectl shortcuts (k, kgp, kgs, etc.)
- **AWS CLI Aliases** - Cloud management shortcuts
- **Homebrew Aliases** - Package management shortcuts
- And many more...

## How It Works
1. Browse available collections
2. Preview the aliases included
3. Apply to your zshrc with one click

Collections are framework-agnostic - just plain shell aliases.
            `}
          />
        }
        actions={
          <ActionPanel>
            <Action.Push
              title="Browse Collections"
              target={<BrowseAliases onDataChange={refresh} />}
              icon={Icon.Book}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );

  return (
    <ListViewController<AliasItem>
      commandName="Aliases"
      navigationTitle="Aliases"
      searchPlaceholder="Search Aliases..."
      icon={Icon.Terminal}
      tintColor={MODERN_COLORS.success}
      itemType="alias"
      itemTypePlural="aliases"
      parser={parseAliases}
      searchFields={["name", "command", "section"]}
      searchBarAccessory={searchBarAccessory}
      warningGenerator={generateAliasWarning}
      showWarningFilter={!searchBarAccessory}
      customHeaderSection={getBrowseAliasesSection}
      enableFrecency={true}
      frecencyNamespace="zshrc-aliases"
      frecencyKey={(alias) => alias.name}
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
          <SharedActionsSection onRefresh={refresh} />
        </ActionPanel>
      )}
      generateItemActions={(alias, refresh, visitItem) => (
        <ActionPanel>
          <Action.Push
            title="Edit Alias"
            target={
              <EditAlias
                existingName={alias.name}
                existingCommand={alias.command}
                sectionLabel={alias.section}
                onSave={() => {
                  visitItem?.(alias);
                  refresh();
                }}
              />
            }
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action.CopyToClipboard
            title="Copy Alias Definition"
            content={`alias ${alias.name}='${alias.command}'`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onCopy={() => visitItem?.(alias)}
          />
          <Action
            title="Delete Alias"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={async () => {
              visitItem?.(alias);
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
          <SharedActionsSection onRefresh={refresh} />
        </ActionPanel>
      )}
    />
  );
}
