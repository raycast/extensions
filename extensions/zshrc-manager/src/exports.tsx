import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCallback, useState, type ReactElement } from "react";
import { parseExports } from "./utils/parsers";
import { truncateValueMiddle } from "./utils/formatters";
import EditExport, { exportConfig } from "./edit-export";
import { MODERN_COLORS } from "./constants";
import { ListViewController, type FilterableItem, type ItemWarning } from "./lib/list-view-controller";
import { deleteItem } from "./lib/delete-item";
import { SharedActionsSection } from "./lib/shared-actions";
import { isSecretName, maskValue, searchableValue } from "./utils/secrets";
import { stripSurroundingQuotes } from "./utils/shell-escape";

/**
 * Export item interface
 */
interface ExportItem extends FilterableItem {
  variable: string;
  value: string;
  /** Empty for secrets so the filter cannot match a masked value */
  searchableValue?: string;
}

interface ExportsProps {
  searchBarAccessory?: ReactElement | null;
}

/**
 * Warning generator for exports
 * Detects duplicate exports
 */
function generateExportWarning(exportItem: ExportItem, allExports: ExportItem[]): ItemWarning | null {
  // Check for duplicates
  const duplicates = allExports.filter((e) => e.variable === exportItem.variable);
  if (duplicates.length > 1) {
    const otherSections = duplicates
      .filter((d) => d !== exportItem)
      .map((d) => d.section)
      .join(", ");
    return {
      type: "duplicate",
      message: `Duplicate export: also defined in ${otherSections}`,
      icon: Icon.ExclamationMark,
      color: Color.Yellow,
    };
  }

  return null;
}

/**
 * Exports management command for zshrc content
 */
export default function Exports({ searchBarAccessory }: ExportsProps) {
  const [revealedVars, setRevealedVars] = useState<ReadonlySet<string>>(new Set());

  // Reveal state is keyed by identity, not name, so revealing one PATH-like
  // duplicate does not reveal its namesakes in other sections
  const revealKey = (exportItem: ExportItem): string => `${exportItem.variable}:${exportItem._sectionOccurrence ?? 0}`;

  const toggleReveal = (key: string) => {
    setRevealedVars((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // The parser keeps the raw right-hand side verbatim (quotes included);
  // display, masking and Copy Value want the value itself
  const realValue = (exportItem: ExportItem): string => stripSurroundingQuotes(exportItem.value);

  // Masking is display-only: copy actions always receive the real value
  const displayValue = (exportItem: ExportItem): string =>
    isSecretName(exportItem.variable) && !revealedVars.has(revealKey(exportItem))
      ? maskValue(realValue(exportItem))
      : realValue(exportItem);

  return (
    <ListViewController<ExportItem>
      commandName="Exports"
      navigationTitle="Exports"
      searchPlaceholder="Search Exports..."
      icon={Icon.Upload}
      tintColor={MODERN_COLORS.primary}
      itemType="export"
      itemTypePlural="exports"
      parser={parseExports}
      searchFields={["variable", "searchableValue", "section"]}
      postProcessItems={useCallback(
        (items: ExportItem[]) =>
          items.map((item) => ({
            ...item,
            searchableValue: searchableValue(item.variable, stripSurroundingQuotes(item.value)),
          })),
        [],
      )}
      searchBarAccessory={searchBarAccessory}
      warningGenerator={generateExportWarning}
      showWarningFilter={!searchBarAccessory}
      generateTitle={(exportItem) => exportItem.variable}
      getItemName={(exportItem) => exportItem.variable}
      getItemValue={realValue}
      getDisplayValue={displayValue}
      generateOverviewMarkdown={(_, allExports, grouped) => `
# Export Summary

Your \`.zshrc\` file contains **${allExports.length} exports** across **${allExports.length > 0 ? Object.keys(grouped).length : 0} sections**.

## 📦 What are Exports?
Exports are environment variables that configure your shell environment and are available to all child processes. They set up your development environment, paths, and application settings.

## 📊 Quick Stats
- **Total Exports**: ${allExports.length}
- **Sections with Exports**: ${Object.keys(grouped).length}
- **Common Types**: PATH, NODE_ENV, EDITOR, and more

## 💡 Tips
- Use descriptive variable names
- Group related exports in the same section
- Consider using conditional exports for different environments
      `}
      omitValueMarkdown={true}
      generateMetadata={(exportItem, displayedValue) => (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Variable"
            text={exportItem.variable}
            icon={{ source: Icon.Upload, tintColor: MODERN_COLORS.primary }}
          />
          <List.Item.Detail.Metadata.Label
            title="Value"
            text={truncateValueMiddle(displayedValue, 60)}
            icon={{ source: Icon.Code, tintColor: MODERN_COLORS.primary }}
          />
          {isSecretName(exportItem.variable) && (
            <List.Item.Detail.Metadata.TagList title="Sensitivity">
              <List.Item.Detail.Metadata.TagList.Item text="Secret" color={Color.Red} icon={Icon.Lock} />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Label
            title="Section"
            text={exportItem.section}
            icon={{
              source: Icon.Folder,
              tintColor: MODERN_COLORS.neutral,
            }}
          />
          <List.Item.Detail.Metadata.Label title="Section Starts" text={`Line ${exportItem.sectionStartLine}`} />
          <List.Item.Detail.Metadata.Label title="File" text="~/.zshrc" icon={Icon.Document} />
        </List.Item.Detail.Metadata>
      )}
      generateOverviewActions={(_, refresh) => (
        <ActionPanel>
          <Action.Push
            title="Add New Export"
            target={<EditExport onSave={refresh} />}
            shortcut={Keyboard.Shortcut.Common.New}
            icon={Icon.Plus}
          />
          <SharedActionsSection onRefresh={refresh} />
        </ActionPanel>
      )}
      generateItemActions={(exportItem, refresh) => (
        <ActionPanel>
          <SharedActionsSection
            onRefresh={refresh}
            item={{
              editTitle: "Edit Export",
              editTarget: (
                <EditExport
                  existingVariable={exportItem.variable}
                  existingValue={exportItem.value}
                  sectionLabel={exportItem.section}
                  sectionOccurrence={exportItem._sectionOccurrence}
                  onSave={refresh}
                />
              ),
              deleteTitle: "Delete Export",
              onDelete: async () => {
                try {
                  await deleteItem(
                    exportItem.variable,
                    exportConfig,
                    false,
                    exportItem.section,
                    exportItem._sectionOccurrence,
                  );
                  refresh();
                } catch {
                  // Error already shown in deleteItem
                }
              },
              copyName: exportItem.variable,
              copyValue: realValue(exportItem),
              // Definition copied as written in the file — re-quoting a value
              // that already carries quotes would change what the line means
              copyDefinition: `export ${exportItem.variable}=${exportItem.value}`,
              isSecret: isSecretName(exportItem.variable),
              revealed: revealedVars.has(revealKey(exportItem)),
              onToggleReveal: () => toggleReveal(revealKey(exportItem)),
            }}
          />
          <ActionPanel.Section>
            <Action.Push
              title="Add New Export"
              target={<EditExport onSave={refresh} />}
              shortcut={Keyboard.Shortcut.Common.New}
              icon={Icon.Plus}
            />
          </ActionPanel.Section>
        </ActionPanel>
      )}
    />
  );
}
