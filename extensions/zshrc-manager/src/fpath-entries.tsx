import { ActionPanel, Icon, List } from "@raycast/api";
import type { ReactElement } from "react";
import { parseFpathEntries } from "./utils/parsers";
import { MODERN_COLORS } from "./constants";
import { ListViewController, type FilterableItem } from "./lib/list-view-controller";
import { SharedActionsSection } from "./lib/shared-actions";

/**
 * FPATH entry item interface
 */
interface FpathEntryItem extends FilterableItem {
  entry: string;
  type: "export" | "append" | "prepend" | "set";
}

interface FpathEntriesProps {
  searchBarAccessory?: ReactElement | null;
}

/**
 * Get icon for FPATH entry type
 */
function getTypeIcon(type: FpathEntryItem["type"]): Icon {
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
 * Get label for FPATH entry type
 */
function getTypeLabel(type: FpathEntryItem["type"]): string {
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
 * FPATH entries management view
 */
export default function FpathEntries({ searchBarAccessory }: FpathEntriesProps) {
  return (
    <ListViewController<FpathEntryItem>
      commandName="FpathEntries"
      navigationTitle="FPATH Entries"
      searchPlaceholder="Search FPATH Entries..."
      icon={Icon.Folder}
      tintColor={MODERN_COLORS.warning}
      itemType="FPATH entry"
      itemTypePlural="FPATH entries"
      parser={parseFpathEntries}
      searchFields={["entry", "type", "section"]}
      searchBarAccessory={searchBarAccessory}
      generateTitle={(item) => item.entry}
      generateOverviewMarkdown={(_, allItems, grouped) => `
# FPATH Summary

Your \`.zshrc\` file contains **${allItems.length} FPATH modifications** across **${allItems.length > 0 ? Object.keys(grouped).length : 0} sections**.

## What is FPATH?

FPATH (Function PATH) tells Zsh where to look for autoloadable shell functions and completion definitions. It's essential for Zsh's completion system and custom functions.

## Quick Stats
- **Total Entries**: ${allItems.length}
- **Exports**: ${allItems.filter((i) => i.type === "export").length}
- **Appends**: ${allItems.filter((i) => i.type === "append").length}

## Common Uses
- **Completion functions**: Custom tab completion
- **Autoload functions**: Functions loaded on demand
- **Oh-My-Zsh plugins**: Plugin completion files
- **Homebrew completions**: \`/opt/homebrew/share/zsh/site-functions\`
      `}
      generateItemMarkdown={(item) => `
# FPATH Entry

## Path
\`\`\`bash
${item.entry}
\`\`\`

## Modification Type
**${getTypeLabel(item.type)}** - ${item.type === "append" ? "Added to FPATH for function/completion lookup" : "Sets or exports FPATH"}

## Location
- **Section**: ${item.section}
- **File**: ~/.zshrc

## Purpose
This path will be searched for autoloadable functions and completion definitions.
      `}
      generateMetadata={(item) => (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Path"
            text={item.entry}
            icon={{
              source: Icon.Folder,
              tintColor: MODERN_COLORS.warning,
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
