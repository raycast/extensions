import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import type { ReactElement } from "react";
import { parseExports } from "./utils/parsers";
import { truncateValueMiddle } from "./utils/formatters";
import EditExport, { exportConfig } from "./edit-export";
import { MODERN_COLORS } from "./constants";
import { ListViewController, type FilterableItem, type ItemWarning } from "./lib/list-view-controller";
import { deleteItem } from "./lib/delete-item";
import { SharedActionsSection } from "./lib/shared-actions";

/**
 * Export item interface
 */
interface ExportItem extends FilterableItem {
  variable: string;
  value: string;
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
      searchFields={["variable", "value", "section"]}
      searchBarAccessory={searchBarAccessory}
      warningGenerator={generateExportWarning}
      showWarningFilter={!searchBarAccessory}
      generateTitle={(exportItem) => exportItem.variable}
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
      generateItemMarkdown={(exportItem) => `
# Export: \`${exportItem.variable}\`

## 📦 Value
\`\`\`bash
${exportItem.value}
\`\`\`

## 📍 Location
- **Section**: ${exportItem.section}
- **File**: ~/.zshrc
- **Section Start**: Line ${exportItem.sectionStartLine}

## 🔧 Usage
This environment variable is available to all processes:
\`\`\`bash
echo $${exportItem.variable}
\`\`\`

## 💡 Common Uses
- **PATH**: Add directories to executable search path
- **NODE_ENV**: Set Node.js environment (development/production)
- **EDITOR**: Set default text editor
- **Custom**: Application-specific configuration
      `}
      generateMetadata={(exportItem) => (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Variable Name"
            text={exportItem.variable}
            icon={{
              source: Icon.Upload,
              tintColor: MODERN_COLORS.primary,
            }}
          />
          <List.Item.Detail.Metadata.Label
            title="Value"
            text={truncateValueMiddle(exportItem.value, 60)}
            icon={{
              source: Icon.Code,
              tintColor: MODERN_COLORS.success,
            }}
          />
          <List.Item.Detail.Metadata.Label
            title="Section"
            text={exportItem.section}
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
          <Action.Push
            title="Edit Export"
            target={
              <EditExport
                existingVariable={exportItem.variable}
                existingValue={exportItem.value}
                sectionLabel={exportItem.section}
                onSave={refresh}
              />
            }
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action
            title="Delete Export"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={async () => {
              try {
                await deleteItem(exportItem.variable, exportConfig);
                refresh();
              } catch {
                // Error already shown in deleteItem
              }
            }}
          />
          <Action.Push
            title="Add New Export"
            target={<EditExport onSave={refresh} />}
            shortcut={Keyboard.Shortcut.Common.New}
            icon={Icon.Plus}
          />
          <SharedActionsSection onRefresh={refresh} />
        </ActionPanel>
      )}
    />
  );
}
