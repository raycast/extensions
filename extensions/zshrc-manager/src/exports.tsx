import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { ZSHRC_PATH } from "./lib/zsh";
import { parseExports } from "./utils/parsers";
import { truncateValueMiddle } from "./utils/formatters";
import EditExport from "./edit-export";
import { MODERN_COLORS } from "./constants";
import { useZshrcLoader } from "./hooks/useZshrcLoader";
import { useZshrcFilter } from "./hooks/useZshrcFilter";

/**
 * Exports management command for zshrc content
 */
export default function Exports() {
  const { sections, isLoading, refresh } = useZshrcLoader("Exports");

  const allExports = (sections || []).flatMap((section) =>
    parseExports(section.content).map((exportItem) => ({
      ...exportItem,
      section: section.label,
      sectionStartLine: section.startLine,
    })),
  );

  const { searchText, setSearchText, grouped } = useZshrcFilter(allExports, [
    "variable",
    "value",
    "section",
  ]);

  return (
    <List
      navigationTitle="Exports"
      searchBarPlaceholder="Search exports..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      isShowingDetail={true}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add New Export"
            target={<EditExport onSave={refresh} />}
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
          title="Export Summary"
          subtitle={`${allExports.length} exports found across ${sections.length} sections`}
          icon={{ source: Icon.Box, tintColor: MODERN_COLORS.primary }}
          detail={
            <List.Item.Detail
              markdown={`
# Export Summary

Your \`.zshrc\` file contains **${allExports.length} exports** across **${sections.length} sections**.

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
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Add New Export"
                target={<EditExport onSave={refresh} />}
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

      {Object.entries(grouped).map(([sectionName, exports]) => (
        <List.Section key={sectionName} title={sectionName}>
          {exports.map((exportItem, index) => (
            <List.Item
              key={`${sectionName}-${exportItem.variable}-${index}`}
              title={exportItem.variable}
              icon={{ source: Icon.Box, tintColor: MODERN_COLORS.primary }}
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
                  metadata={
                    <List.Item.Detail.Metadata>
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
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
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
                  <Action.Push
                    title="Add New Export"
                    target={<EditExport onSave={refresh} />}
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
        <List.Section title="No Exports Found">
          <List.Item
            title="No exports match your search"
            subtitle="Try adjusting your search terms"
            icon={{
              source: Icon.MagnifyingGlass,
              tintColor: MODERN_COLORS.neutral,
            }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add New Export"
                  target={<EditExport onSave={refresh} />}
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
