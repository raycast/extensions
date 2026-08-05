import { Icon, List } from "@raycast/api";
import type { ReactElement } from "react";
import { parseFunctions } from "./utils/parsers";
import { MODERN_COLORS } from "./constants";
import { ListViewController, type FilterableItem } from "./lib/list-view-controller";

/**
 * Function item interface
 */
interface FunctionItem extends FilterableItem {
  name: string;
}

interface FunctionsProps {
  searchBarAccessory?: ReactElement | null;
}

/**
 * Functions management command for zshrc content
 */
export default function Functions({ searchBarAccessory }: FunctionsProps) {
  return (
    <ListViewController<FunctionItem>
      commandName="Functions"
      navigationTitle="Functions"
      searchPlaceholder="Search Functions..."
      icon={Icon.Code}
      tintColor={MODERN_COLORS.purple}
      itemType="function"
      itemTypePlural="functions"
      parser={parseFunctions}
      searchFields={["name", "section"]}
      searchBarAccessory={searchBarAccessory}
      generateTitle={(func) => func.name}
      getItemName={(func) => func.name}
      getItemValue={(func) => `${func.name}()`}
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
      generateMetadata={(func) => (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Function"
            text={func.name}
            icon={{ source: Icon.Code, tintColor: MODERN_COLORS.purple }}
          />
          <List.Item.Detail.Metadata.Label
            title="Section"
            text={func.section}
            icon={{
              source: Icon.Folder,
              tintColor: MODERN_COLORS.neutral,
            }}
          />
          <List.Item.Detail.Metadata.Label title="Section Starts" text={`Line ${func.sectionStartLine}`} />
          <List.Item.Detail.Metadata.Label title="File" text="~/.zshrc" icon={Icon.Document} />
        </List.Item.Detail.Metadata>
      )}
    />
  );
}
