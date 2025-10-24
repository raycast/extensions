/**
 * Generic list view controller for zshrc content types
 *
 * Eliminates code duplication across similar list views (aliases, exports, functions, etc.)
 * by providing a configurable component that handles common patterns.
 */

import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { ZSHRC_PATH } from "./zsh";
import { MODERN_COLORS } from "../constants";
import { useZshrcLoader } from "../hooks/useZshrcLoader";
import { useZshrcFilter } from "../hooks/useZshrcFilter";
import { LogicalSection } from "./parse-zshrc";

/**
 * Filterable item interface for list view items
 */
export interface FilterableItem {
  section: string;
  sectionStartLine: number;
  [key: string]: unknown;
}

/**
 * Configuration for generating item title
 */
export type TitleGenerator<T extends FilterableItem> = (item: T) => string;

/**
 * Configuration for generating markdown content
 */
export type MarkdownGenerator<T extends FilterableItem> = (
  item: T,
  allItems: T[],
  grouped: Record<string, T[]>,
) => string;

/**
 * Configuration for generating metadata content
 */
export type MetadataGenerator<T extends FilterableItem> = (item: T) => React.ReactNode;

/**
 * Configuration for generating actions
 */
export type ActionsGenerator<T extends FilterableItem> = (item: T, refresh: () => void) => React.ReactNode;

/**
 * Configuration for the list view
 */
export interface ListViewConfig<T extends FilterableItem> {
  /** Command name for caching */
  commandName: string;
  /** Navigation title */
  navigationTitle: string;
  /** Search bar placeholder */
  searchPlaceholder: string;
  /** Icon for items */
  icon: Icon;
  /** Tint color for icon */
  tintColor: string;
  /** Item type name (singular) */
  itemType: string;
  /** Item type name (plural) */
  itemTypePlural: string;
  /** Parser function to extract items from section content */
  parser: (content: string) => ReadonlyArray<Partial<T>> | Array<Partial<T>>;
  /** Fields to search on */
  searchFields: string[];
  /** Generate markdown for overview section */
  generateOverviewMarkdown: MarkdownGenerator<T>;
  /** Generate markdown for item detail */
  generateItemMarkdown: MarkdownGenerator<T>;
  /** Generate metadata for item detail */
  generateMetadata?: MetadataGenerator<T>;
  /** Generate actions for items */
  generateItemActions?: ActionsGenerator<T>;
  /** Generate actions for overview item */
  generateOverviewActions?: ActionsGenerator<T>;
  /** Generate title for list item */
  generateTitle: TitleGenerator<T>;
  /** Custom post-processing of items */
  postProcessItems?: (items: T[]) => T[];
}

/**
 * Generic list view controller component
 *
 * Provides a reusable component for displaying and managing zshrc content
 * with filtering, searching, and section grouping.
 */
export function ListViewController<T extends FilterableItem>(config: ListViewConfig<T>) {
  const { sections, isLoading, refresh } = useZshrcLoader(config.commandName);

  // Parse items from all sections
  const allItemsRaw = (sections || []).flatMap((section: LogicalSection) =>
    config.parser(section.content).map(
      (item) =>
        ({
          ...item,
          section: section.label,
          sectionStartLine: section.startLine,
        }) as T,
    ),
  );

  // Apply post-processing if configured
  const allItems = config.postProcessItems ? config.postProcessItems(allItemsRaw) : allItemsRaw;

  // Filter and group items
  const { searchText, setSearchText, grouped } = useZshrcFilter(allItems, config.searchFields);

  // Generate overview actions
  const getOverviewActions = (): React.ReactNode => {
    if (config.generateOverviewActions) {
      const dummyItem = allItems[0] || ({} as T);
      const actions = config.generateOverviewActions(dummyItem, refresh);
      if (actions) return actions;
    }

    return (
      <ActionPanel>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={refresh}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
        <Action.Open title="Open ~/.Zshrc" target={ZSHRC_PATH} icon={Icon.Document} />
      </ActionPanel>
    );
  };

  // Generate item actions
  const getItemActions = (item: T): React.ReactNode => {
    if (config.generateItemActions) {
      const actions = config.generateItemActions(item, refresh);
      if (actions) return actions;
    }

    return (
      <ActionPanel>
        <Action.Open title="Open ~/.Zshrc" target={ZSHRC_PATH} icon={Icon.Document} />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={refresh}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      </ActionPanel>
    );
  };

  // Default actions for empty state
  const getEmptyActions = (): React.ReactNode => {
    return (
      <ActionPanel>
        <Action.Open title="Open ~/.Zshrc" target={ZSHRC_PATH} icon={Icon.Document} />
      </ActionPanel>
    );
  };

  return (
    <List
      navigationTitle={config.navigationTitle}
      searchBarPlaceholder={config.searchPlaceholder}
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
          <Action.Open title="Open ~/.Zshrc" target={ZSHRC_PATH} icon={Icon.Document} />
        </ActionPanel>
      }
    >
      <List.Section title="Overview">
        <List.Item
          title={`${config.itemType.charAt(0).toUpperCase() + config.itemType.slice(1)} Summary`}
          subtitle={`${allItems.length} ${config.itemTypePlural} found across ${sections.length} sections`}
          icon={{ source: config.icon, tintColor: config.tintColor }}
          detail={
            <List.Item.Detail markdown={config.generateOverviewMarkdown(allItems[0] || ({} as T), allItems, grouped)} />
          }
          actions={getOverviewActions()}
        />
      </List.Section>

      {Object.entries(grouped).map(([sectionName, items]) => (
        <List.Section key={sectionName} title={sectionName}>
          {items.map((item, index) => (
            <List.Item
              key={`${sectionName}-${index}`}
              title={config.generateTitle(item)}
              icon={{ source: config.icon, tintColor: config.tintColor }}
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
                  markdown={config.generateItemMarkdown(item, allItems, grouped)}
                  metadata={config.generateMetadata ? config.generateMetadata(item) : undefined}
                />
              }
              actions={getItemActions(item)}
            />
          ))}
        </List.Section>
      ))}

      {Object.keys(grouped).length === 0 && !isLoading && (
        <List.Section title={`No ${config.itemType.charAt(0).toUpperCase() + config.itemType.slice(1)}s Found`}>
          <List.Item
            title={`No ${config.itemTypePlural} match your search`}
            subtitle="Try adjusting your search terms"
            icon={{
              source: Icon.MagnifyingGlass,
              tintColor: MODERN_COLORS.neutral,
            }}
            actions={getEmptyActions()}
          />
        </List.Section>
      )}
    </List>
  );
}
