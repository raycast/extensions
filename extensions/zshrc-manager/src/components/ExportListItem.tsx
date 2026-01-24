import React from "react";
import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import { truncateValueMiddle } from "../utils/formatters";
import EditExport, { exportConfig } from "../edit-export";
import { deleteItem } from "../lib/delete-item";
import { shellQuoteDouble } from "../utils/shell-escape";

interface ExportListItemProps {
  exportItem: {
    variable: string;
    value: string;
  };
  sectionLabel: string;
  index: number;
  onDelete: () => void;
}

/**
 * Reusable export list item component with detail view and actions
 */
export function ExportListItem({ exportItem, sectionLabel, index, onDelete }: ExportListItemProps) {
  return (
    <List.Item
      key={`export-${exportItem.variable}-${index}`}
      title={exportItem.variable}
      subtitle={truncateValueMiddle(exportItem.value, 60)}
      icon={{
        source: Icon.Upload,
        tintColor: MODERN_COLORS.primary,
      }}
      detail={
        <List.Item.Detail
          markdown={`
# Export: \`${exportItem.variable}\`

**Value:** \`${exportItem.value}\`

**Full Definition:**
\`\`\`zsh
export ${exportItem.variable}="${shellQuoteDouble(exportItem.value)}"
\`\`\`
          `}
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
                sectionLabel={sectionLabel}
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
                onDelete();
              } catch {
                // Error already shown in deleteItem
              }
            }}
          />
          <Action.Push
            title="View Export Detail"
            target={
              <Detail
                navigationTitle={`Export: ${exportItem.variable}`}
                markdown={`
# Export: \`${exportItem.variable}\`

**Value:** \`${exportItem.value}\`

**Full Definition:**
\`\`\`zsh
export ${exportItem.variable}="${shellQuoteDouble(exportItem.value)}"
\`\`\`

**Usage:**
This environment variable will be available to all child processes.
                `}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Export"
                      content={`export ${exportItem.variable}="${shellQuoteDouble(exportItem.value)}"`}
                    />
                    <Action.CopyToClipboard title="Copy Value Only" content={exportItem.value} />
                    <Action.CopyToClipboard title="Copy Variable Only" content={exportItem.variable} />
                  </ActionPanel>
                }
              />
            }
            icon={Icon.Eye}
          />
          <Action.CopyToClipboard
            title="Copy Export"
            content={`export ${exportItem.variable}="${shellQuoteDouble(exportItem.value)}"`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Value Only"
            content={exportItem.value}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Variable Only"
            content={exportItem.variable}
            shortcut={{ modifiers: ["cmd", "alt"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
