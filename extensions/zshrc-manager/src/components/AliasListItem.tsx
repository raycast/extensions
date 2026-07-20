import React from "react";
import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import { truncateValueMiddle } from "../utils/formatters";
import EditAlias, { aliasConfig } from "../edit-alias";
import { deleteItem } from "../lib/delete-item";

interface AliasListItemProps {
  alias: {
    name: string;
    command: string;
  };
  sectionLabel: string;
  index: number;
  onDelete: () => void;
}

/**
 * Reusable alias list item component with detail view and actions
 */
export function AliasListItem({ alias, sectionLabel, index, onDelete }: AliasListItemProps) {
  return (
    <List.Item
      key={`alias-${alias.name}-${index}`}
      title={alias.name}
      subtitle={truncateValueMiddle(alias.command, 60)}
      icon={{
        source: Icon.Terminal,
        tintColor: MODERN_COLORS.success,
      }}
      detail={
        <List.Item.Detail
          markdown={`
# Alias: \`${alias.name}\`

**Command:** \`${alias.command}\`

**Full Definition:**
\`\`\`zsh
alias ${alias.name}='${alias.command}'
\`\`\`
          `}
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Alias"
            target={<EditAlias existingName={alias.name} existingCommand={alias.command} sectionLabel={sectionLabel} />}
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action
            title="Delete Alias"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={async () => {
              try {
                await deleteItem(alias.name, aliasConfig);
                onDelete();
              } catch {
                // Error already shown in deleteItem
              }
            }}
          />
          <Action.Push
            title="View Alias Detail"
            target={
              <Detail
                navigationTitle={`Alias: ${alias.name}`}
                markdown={`
# Alias: \`${alias.name}\`

**Command:** \`${alias.command}\`

**Full Definition:**
\`\`\`zsh
alias ${alias.name}='${alias.command}'
\`\`\`

**Usage:**
Type \`${alias.name}\` in your terminal to execute: \`${alias.command}\`
                `}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Alias" content={`alias ${alias.name}='${alias.command}'`} />
                    <Action.CopyToClipboard title="Copy Command Only" content={alias.command} />
                    <Action.CopyToClipboard title="Copy Name Only" content={alias.name} />
                  </ActionPanel>
                }
              />
            }
            icon={Icon.Eye}
          />
          <Action.CopyToClipboard
            title="Copy Alias"
            content={`alias ${alias.name}='${alias.command}'`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Command Only"
            content={alias.command}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Name Only"
            content={alias.name}
            shortcut={{ modifiers: ["cmd", "alt"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
