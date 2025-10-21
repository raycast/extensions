import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { ZSHRC_PATH } from "./lib/zsh";
import { parseFunctions } from "./utils/parsers";
import { MODERN_COLORS } from "./constants";
import { useZshrcLoader } from "./hooks/useZshrcLoader";
import { useZshrcFilter } from "./hooks/useZshrcFilter";

/**
 * Functions management command for zshrc content
 */
export default function Functions() {
  const { sections, isLoading, refresh } = useZshrcLoader("Functions");

  const allFunctions = (sections || []).flatMap((section) =>
    parseFunctions(section.content).map((func) => ({
      ...func,
      section: section.label,
      sectionStartLine: section.startLine,
    })),
  );

  const { searchText, setSearchText, grouped } = useZshrcFilter(allFunctions, [
    "name",
    "section",
  ]);

  return (
    <List
      navigationTitle="Functions"
      searchBarPlaceholder="Search functions..."
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
          title="Function Summary"
          subtitle={`${allFunctions.length} functions found across ${sections.length} sections`}
          icon={{ source: Icon.Code, tintColor: MODERN_COLORS.primary }}
          detail={
            <List.Item.Detail
              markdown={`
# Function Summary

Your \`.zshrc\` file contains **${allFunctions.length} functions** across **${sections.length} sections**.

## 🔧 What are Functions?
Functions are custom shell commands defined in your zshrc file. They can contain complex logic, multiple commands, and parameters, making them more powerful than simple aliases.

## 📊 Quick Stats
- **Total Functions**: ${allFunctions.length}
- **Sections with Functions**: ${Object.keys(grouped).length}
- **Common Uses**: Complex aliases, utility functions, lazy loading

## 💡 Tips
- Use functions for complex logic that aliases can't handle
- Functions can accept parameters and return values
- Consider using functions for lazy loading to improve shell startup time
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

      {Object.entries(grouped).map(([sectionName, functions]) => (
        <List.Section key={sectionName} title={sectionName}>
          {functions.map((func, index) => (
            <List.Item
              key={`${sectionName}-${func.name}-${index}`}
              title={func.name}
              icon={{ source: Icon.Code, tintColor: MODERN_COLORS.primary }}
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
# Function: \`${func.name}()\`

## 🔧 Function Definition
\`\`\`zsh
${func.name}() {
  # Function body
}
\`\`\`

## 📍 Location
- **Section**: ${func.section}
- **File**: ~/.zshrc
- **Section Start**: Line ${func.sectionStartLine}

## 💡 Usage
Call this function in your terminal:
\`\`\`bash
${func.name}
\`\`\`

## 🔍 Function Types
- **Utility Functions**: Helper commands for common tasks
- **Lazy Loading**: Functions that load tools on-demand
- **Complex Aliases**: Multi-step commands with logic
- **Custom Commands**: Personalized shell commands

## ⚠️ Note
Function bodies are not parsed from the zshrc file. Use the "Open ~/.Zshrc" action to view the complete function definition.
                  `}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Function Name"
                        text={func.name}
                        icon={{
                          source: Icon.Code,
                          tintColor: MODERN_COLORS.primary,
                        }}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Section"
                        text={func.section}
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
                        text="Shell Function"
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
        <List.Section title="No Functions Found">
          <List.Item
            title="No functions match your search"
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
