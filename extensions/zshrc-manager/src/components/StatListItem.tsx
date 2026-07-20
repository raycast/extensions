import type React from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getZshrcPath } from "../lib/zsh";
import { truncateValueMiddle } from "../utils/formatters";

interface StatListItemProps<T> {
  /** Display title for the stat category */
  title: string;
  /** Icon to display */
  icon: Icon;
  /** Icon tint color */
  tintColor: string;
  /** Array of items to display */
  items: readonly T[];
  /** Function to get display label from item */
  getItemLabel: (item: T) => string;
  /** Function to get secondary label from item (optional) */
  getItemSubtitle?: ((item: T) => string) | undefined;
  /** Markdown content for the detail panel */
  markdownContent: string;
  /** Component to push when viewing all */
  viewAllTarget: React.ReactElement;
  /** View all action title */
  viewAllTitle: string;
  /** Callback when refresh is requested */
  onRefresh: () => void;
}

/**
 * Reusable statistics list item component
 * Used in zshrc-statistics.tsx to reduce code duplication
 */
export function StatListItem<T>({
  title,
  icon,
  tintColor,
  items,
  getItemLabel,
  getItemSubtitle,
  markdownContent,
  viewAllTarget,
  viewAllTitle,
  onRefresh,
}: StatListItemProps<T>) {
  return (
    <List.Item
      title={title}
      icon={{ source: icon, tintColor }}
      accessories={[{ text: `${items.length}` }]}
      detail={
        <List.Item.Detail
          markdown={markdownContent}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={`${title} Found`} text={`${items.length} total`} />
              {items.slice(0, 6).map((item, idx) => {
                const subtitle = getItemSubtitle ? truncateValueMiddle(getItemSubtitle(item)) : null;
                return subtitle ? (
                  <List.Item.Detail.Metadata.Label
                    key={`${title.toLowerCase()}-${idx}`}
                    title={getItemLabel(item)}
                    text={subtitle}
                    icon={{ source: icon, tintColor }}
                  />
                ) : (
                  <List.Item.Detail.Metadata.Label
                    key={`${title.toLowerCase()}-${idx}`}
                    title={getItemLabel(item)}
                    icon={{ source: icon, tintColor }}
                  />
                );
              })}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push title={viewAllTitle} target={viewAllTarget} icon={icon} />
          <Action.Open title="Open ~/.Zshrc" target={getZshrcPath()} icon={Icon.Document} />
          <Action
            title="Refresh Statistics"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
