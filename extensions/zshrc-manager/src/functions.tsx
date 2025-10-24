import { Icon, List } from "@raycast/api";
import { parseFunctions } from "./utils/parsers";
import { MODERN_COLORS } from "./constants";
import { ListViewController, type FilterableItem } from "./lib/list-view-controller";

/**
 * Function item interface
 */
interface FunctionItem extends FilterableItem {
  name: string;
}

/**
 * Functions management command for zshrc content
 */
export default function Functions() {
  return (
    <ListViewController<FunctionItem>
      commandName="Functions"
      navigationTitle="Functions"
      searchPlaceholder="Search functions..."
      icon={Icon.Code}
      tintColor={MODERN_COLORS.primary}
      itemType="function"
      itemTypePlural="functions"
      parser={parseFunctions}
      searchFields={["name", "section"]}
      generateTitle={(func) => func.name}
      generateOverviewMarkdown={(_, allFunctions, grouped) => `
# Function Summary

Your \`.zshrc\` file contains **${allFunctions.length} functions** across **${allFunctions.length > 0 ? Object.keys(grouped).length : 0} sections**.

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
      generateItemMarkdown={(func) => `
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
      generateMetadata={(func) => (
        <>
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
        </>
      )}
    />
  );
}
