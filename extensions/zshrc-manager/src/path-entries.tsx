import { ActionPanel, Icon, List } from "@raycast/api";
import type { ReactElement } from "react";
import { parsePathEntries } from "./utils/parsers";
import { MODERN_COLORS } from "./constants";
import { ListViewController, type FilterableItem } from "./lib/list-view-controller";
import { SharedActionsSection } from "./lib/shared-actions";

/**
 * PATH entry item interface
 */
interface PathEntryItem extends FilterableItem {
  entry: string;
  type: "export" | "append" | "prepend" | "set";
}

interface PathEntriesProps {
  searchBarAccessory?: ReactElement | null;
}

/**
 * Get icon for PATH entry type
 */
function getTypeIcon(type: PathEntryItem["type"]): Icon {
  switch (type) {
    case "export":
      return Icon.Upload;
    case "append":
      return Icon.PlusCircle;
    case "prepend":
      return Icon.ArrowUp;
    default:
      return Icon.Dot;
  }
}

/**
 * Get label for PATH entry type
 */
function getTypeLabel(type: PathEntryItem["type"]): string {
  switch (type) {
    case "export":
      return "Export";
    case "append":
      return "Append";
    case "prepend":
      return "Prepend";
    case "set":
      return "Set";
    default:
      return "Unknown";
  }
}

/**
 * PATH entries management view
 */
export default function PathEntries({ searchBarAccessory }: PathEntriesProps) {
  return (
    <ListViewController<PathEntryItem>
      commandName="PathEntries"
      navigationTitle="PATH Entries"
      searchPlaceholder="Search PATH Entries..."
      icon={Icon.Terminal}
      tintColor={MODERN_COLORS.info}
      itemType="PATH entry"
      itemTypePlural="PATH entries"
      parser={parsePathEntries}
      searchFields={["entry", "type", "section"]}
      searchBarAccessory={searchBarAccessory}
      generateTitle={(item) => item.entry}
      generateOverviewMarkdown={(_, allItems, grouped) => `
# PATH Summary

Your \`.zshrc\` file contains **${allItems.length} PATH modifications** across **${allItems.length > 0 ? Object.keys(grouped).length : 0} sections**.

## What is PATH?

The PATH environment variable tells your shell where to look for executable programs. When you type a command, the shell searches through directories listed in PATH to find it.

## Quick Stats
- **Total Entries**: ${allItems.length}
- **Exports**: ${allItems.filter((i) => i.type === "export").length}
- **Appends**: ${allItems.filter((i) => i.type === "append").length}
- **Prepends**: ${allItems.filter((i) => i.type === "prepend").length}

## Tips
- **Prepend** directories to give them higher priority
- **Append** directories for lower priority additions
- Avoid duplicate entries for cleaner PATH
      `}
      generateItemMarkdown={(item) => `
# PATH Entry

## Path
\`\`\`bash
${item.entry}
\`\`\`

## Modification Type
**${getTypeLabel(item.type)}** - ${item.type === "prepend" ? "Added to the beginning of PATH (higher priority)" : item.type === "append" ? "Added to the end of PATH (lower priority)" : "Sets or exports PATH"}

## Location
- **Section**: ${item.section}
- **File**: ~/.zshrc

## Usage
This path will be searched when looking for executables.
      `}
      generateMetadata={(item) => (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Path"
            text={item.entry}
            icon={{
              source: Icon.Folder,
              tintColor: MODERN_COLORS.info,
            }}
          />
          <List.Item.Detail.Metadata.Label
            title="Type"
            text={getTypeLabel(item.type)}
            icon={{
              source: getTypeIcon(item.type),
              tintColor: MODERN_COLORS.primary,
            }}
          />
          <List.Item.Detail.Metadata.Label
            title="Section"
            text={item.section}
            icon={{
              source: Icon.Folder,
              tintColor: MODERN_COLORS.neutral,
            }}
          />
        </List.Item.Detail.Metadata>
      )}
      generateOverviewActions={(_, refresh) => (
        <ActionPanel>
          <SharedActionsSection onRefresh={refresh} />
        </ActionPanel>
      )}
      generateItemActions={(_, refresh) => (
        <ActionPanel>
          <SharedActionsSection onRefresh={refresh} />
        </ActionPanel>
      )}
    />
  );
}
