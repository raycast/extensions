import { ActionPanel, Icon, List } from "@raycast/api";
import type { ReactElement } from "react";
import { parseKeybindings } from "./utils/parsers";
import { MODERN_COLORS } from "./constants";
import { ListViewController, type FilterableItem } from "./lib/list-view-controller";
import { SharedActionsSection } from "./lib/shared-actions";

/**
 * Keybinding item interface
 */
interface KeybindingItem extends FilterableItem {
  key: string;
  command: string;
  widget?: string;
}

interface KeybindingsProps {
  searchBarAccessory?: ReactElement | null;
}

/**
 * Format key sequence for display
 */
function formatKeyDisplay(key: string): string {
  return key
    .replace(/\^/g, "Ctrl+")
    .replace(/\\e/g, "Esc ")
    .replace(/\\M-/g, "Alt+")
    .replace(/\[A/g, "Up")
    .replace(/\[B/g, "Down")
    .replace(/\[C/g, "Right")
    .replace(/\[D/g, "Left");
}

/**
 * Keybindings management view
 */
export default function Keybindings({ searchBarAccessory }: KeybindingsProps) {
  return (
    <ListViewController<KeybindingItem>
      commandName="Keybindings"
      navigationTitle="Keybindings"
      searchPlaceholder="Search Keybindings..."
      icon={Icon.Keyboard}
      tintColor={MODERN_COLORS.accent}
      itemType="keybinding"
      itemTypePlural="keybindings"
      parser={parseKeybindings}
      searchFields={["key", "command", "section"]}
      searchBarAccessory={searchBarAccessory}
      generateTitle={(item) => `${formatKeyDisplay(item.key)} → ${item.command}`}
      generateOverviewMarkdown={(_, allItems, grouped) => `
# Keybindings Summary

Your \`.zshrc\` file contains **${allItems.length} custom keybindings** across **${allItems.length > 0 ? Object.keys(grouped).length : 0} sections**.

## What are Keybindings?

Keybindings (bindkey) map keyboard shortcuts to Zsh Line Editor (ZLE) widgets or custom actions. They customize how you interact with your command line.

## Quick Stats
- **Total Keybindings**: ${allItems.length}
- **Sections with Keybindings**: ${Object.keys(grouped).length}

## Common Widgets
- **beginning-of-line**: Jump to line start
- **end-of-line**: Jump to line end
- **backward-kill-word**: Delete word backward
- **history-search-backward**: Search history
- **accept-line**: Execute command
      `}
      generateItemMarkdown={(item) => `
# Keybinding

## Key Sequence
\`\`\`
${item.key}
\`\`\`
**Display**: ${formatKeyDisplay(item.key)}

## Widget/Command
\`\`\`bash
${item.command}
\`\`\`

${item.widget ? `**Type**: ${item.widget}` : ""}

## Location
- **Section**: ${item.section}
- **File**: ~/.zshrc

## Usage
Press the key combination to trigger the bound action.
      `}
      generateMetadata={(item) => (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Key"
            text={formatKeyDisplay(item.key)}
            icon={{
              source: Icon.Keyboard,
              tintColor: MODERN_COLORS.accent,
            }}
          />
          <List.Item.Detail.Metadata.Label
            title="Raw Key"
            text={item.key}
            icon={{
              source: Icon.Code,
              tintColor: MODERN_COLORS.neutral,
            }}
          />
          <List.Item.Detail.Metadata.Label
            title="Command/Widget"
            text={item.command}
            icon={{
              source: Icon.Terminal,
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
