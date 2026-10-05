import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import type { ReactElement } from "react";
import { parseAliases } from "./utils/parsers";
import { truncateValueMiddle } from "./utils/formatters";
import EditAlias, { aliasConfig } from "./edit-alias";
import { MODERN_COLORS } from "./constants";
import { ListViewController, type FilterableItem, type ItemWarning } from "./lib/list-view-controller";
import { deleteItem } from "./lib/delete-item";
import { findShadowedExecutable } from "./lib/resolve";
import { SharedActionsSection } from "./lib/shared-actions";
import { shellQuoteSingle } from "./utils/shell-escape";

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
 * Detects duplicate alias definitions across sections, and aliases that
 * shadow a real executable on PATH
 */
export function generateAliasWarning(alias: AliasItem, allAliases: AliasItem[]): ItemWarning | null {
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

  // Check for shadowed commands
  const shadowedExecutable = findShadowedExecutable(alias.name);
  if (shadowedExecutable) {
    return {
      type: "conflict",
      message: `Shadows ${shadowedExecutable}`,
      icon: Icon.ExclamationMark,
      color: Color.Orange,
    };
  }

  return null;
}

/**
 * Aliases management command for zshrc content
 */
export default function Aliases({ searchBarAccessory }: AliasesProps) {
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
      enableFrecency={true}
      frecencyNamespace="zshrc-aliases"
      frecencyKey={(alias) => alias.name}
      generateTitle={(alias) => alias.name}
      getItemName={(alias) => alias.name}
      getItemValue={(alias) => alias.command}
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
      omitValueMarkdown={true}
      generateMetadata={(alias) => {
        const shadowedExecutable = findShadowedExecutable(alias.name);
        return (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label
              title="Alias Name"
              text={alias.name}
              icon={{ source: Icon.Terminal, tintColor: MODERN_COLORS.success }}
            />
            {shadowedExecutable && (
              <List.Item.Detail.Metadata.Label
                title="Shadows"
                text={truncateValueMiddle(shadowedExecutable, 60)}
                icon={{
                  source: Icon.ExclamationMark,
                  tintColor: MODERN_COLORS.warning,
                }}
              />
            )}
            <List.Item.Detail.Metadata.Label
              title="Command"
              text={truncateValueMiddle(alias.command, 60)}
              icon={{ source: Icon.Code, tintColor: MODERN_COLORS.primary }}
            />
            <List.Item.Detail.Metadata.Label
              title="Section"
              text={alias.section}
              icon={{
                source: Icon.Folder,
                tintColor: MODERN_COLORS.neutral,
              }}
            />
            <List.Item.Detail.Metadata.Label title="Section Starts" text={`Line ${alias.sectionStartLine}`} />
            <List.Item.Detail.Metadata.Label title="File" text="~/.zshrc" icon={Icon.Document} />
          </List.Item.Detail.Metadata>
        );
      }}
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
          <SharedActionsSection
            onRefresh={refresh}
            item={{
              editTitle: "Edit Alias",
              editTarget: (
                <EditAlias
                  existingName={alias.name}
                  existingCommand={alias.command}
                  sectionLabel={alias.section}
                  sectionOccurrence={alias._sectionOccurrence}
                  onSave={() => {
                    visitItem?.(alias);
                    refresh();
                  }}
                />
              ),
              deleteTitle: "Delete Alias",
              onDelete: async () => {
                try {
                  await deleteItem(alias.name, aliasConfig, false, alias.section, alias._sectionOccurrence);
                  refresh();
                } catch {
                  // Error already shown in deleteItem
                }
              },
              copyName: alias.name,
              copyValue: alias.command,
              copyDefinition: `alias ${alias.name}='${shellQuoteSingle(alias.command)}'`,
              onVisit: () => visitItem?.(alias),
            }}
          />
          <ActionPanel.Section>
            <Action.Push
              title="Add New Alias"
              target={<EditAlias onSave={refresh} />}
              shortcut={Keyboard.Shortcut.Common.New}
              icon={Icon.Plus}
            />
          </ActionPanel.Section>
        </ActionPanel>
      )}
    />
  );
}
