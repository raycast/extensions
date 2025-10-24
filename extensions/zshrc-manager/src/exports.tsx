import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { parseExports } from "./utils/parsers";
import { truncateValueMiddle } from "./utils/formatters";
import EditExport from "./edit-export";
import { MODERN_COLORS } from "./constants";
import { getZshrcPath } from "./lib/zsh";
import { ListViewController, type FilterableItem } from "./lib/list-view-controller";

/**
 * Export item interface
 */
interface ExportItem extends FilterableItem {
  variable: string;
  value: string;
}

/**
 * Exports management command for zshrc content
 */
export default function Exports() {
  return (
    <ListViewController<ExportItem>
      commandName="Exports"
      navigationTitle="Exports"
      searchPlaceholder="Search exports..."
      icon={Icon.Box}
      tintColor={MODERN_COLORS.primary}
      itemType="export"
      itemTypePlural="exports"
      parser={parseExports}
      searchFields={["variable", "value", "section"]}
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
        <>
          <List.Item.Detail.Metadata.Label
            title="Variable Name"
            text={exportItem.variable}
            icon={{
              source: Icon.Box,
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
        </>
      )}
      generateOverviewActions={(_, refresh) => (
        <ActionPanel>
          <Action.Push title="Add New Export" target={<EditExport onSave={refresh} />} icon={Icon.Plus} />
          <Action.Open title="Open ~/.Zshrc" target={getZshrcPath()} icon={Icon.Document} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
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
          <Action.Push title="Add New Export" target={<EditExport onSave={refresh} />} icon={Icon.Plus} />
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
