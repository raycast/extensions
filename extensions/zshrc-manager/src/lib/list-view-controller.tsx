/**
 * Generic list view controller for zshrc content types
 *
 * Eliminates code duplication across similar list views (aliases, exports, functions, etc.)
 * by providing a configurable component that handles common patterns.
 */

import type React from "react";
import { useState, useMemo } from "react";
import { ActionPanel, List, Icon, Color } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { MODERN_COLORS } from "../constants";
import { useZshrcLoader } from "../hooks/useZshrcLoader";
import { useZshrcFilter } from "../hooks/useZshrcFilter";
import type { LogicalSection } from "./parse-zshrc";
import { SharedActionsSection } from "./shared-actions";

/**
 * Warning info for an item
 */
export interface ItemWarning {
  /** Warning type identifier */
  type: "duplicate" | "conflict" | "broken" | "custom";
  /** Short message for the warning */
  message: string;
  /** Icon to display */
  icon?: Icon;
  /** Color for the warning icon */
  color?: Color;
}

/**
 * Warning generator function type
 */
export type WarningGenerator<T extends FilterableItem> = (item: T, allItems: T[]) => ItemWarning | null;

/**
 * Filterable item interface for list view items
 */
export interface FilterableItem {
  section: string;
  sectionStartLine: number;
  /** Stable unique ID assigned during parsing (used for React keys) */
  _stableId?: number;
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
 * @param item The item to generate actions for
 * @param refresh Function to refresh the data
 * @param visitItem Optional function to track item usage for frecency sorting
 */
export type ActionsGenerator<T extends FilterableItem> = (
  item: T,
  refresh: () => void,
  visitItem?: (item: T) => void,
) => React.ReactNode;

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
  /** Optional search bar accessory (e.g., dropdown) */
  searchBarAccessory?: React.ReactElement | null | undefined;
  /** Optional warning generator to detect issues with items */
  warningGenerator?: WarningGenerator<T>;
  /** Whether to show the warning filter dropdown */
  showWarningFilter?: boolean;
  /** Custom header section rendered after Overview. Can be a ReactNode or a function that receives refresh */
  customHeaderSection?: React.ReactNode | ((refresh: () => void) => React.ReactNode);
  /** Enable frecency-based sorting (items used more frequently appear first) */
  enableFrecency?: boolean;
  /** Namespace for frecency storage (required if enableFrecency is true) */
  frecencyNamespace?: string;
  /** Function to generate a unique key for frecency tracking */
  frecencyKey?: (item: T) => string;
}

/**
 * Generic list view controller component
 *
 * Provides a reusable component for displaying and managing zshrc content
 * with filtering, searching, and section grouping.
 */
/**
 * Warning filter options
 */
type WarningFilter = "all" | "warnings_only" | "no_warnings";

export function ListViewController<T extends FilterableItem>(config: ListViewConfig<T>) {
  const { sections, isLoading, refresh } = useZshrcLoader(config.commandName);
  const [warningFilter, setWarningFilter] = useState<WarningFilter>("all");

  // Parse items from all sections with stable unique IDs
  // The _stableId is assigned during initial parsing and remains constant
  // through frecency sorting, ensuring React keys stay stable across reorders
  let stableIdCounter = 0;
  const allItemsRaw = (sections || []).flatMap((section: LogicalSection) =>
    config.parser(section.content).map(
      (item) =>
        ({
          ...item,
          section: section.label,
          sectionStartLine: section.startLine,
          _stableId: stableIdCounter++,
        }) as T,
    ),
  );

  // Apply post-processing if configured
  const postProcessedItems = config.postProcessItems ? config.postProcessItems(allItemsRaw) : allItemsRaw;

  // Apply frecency sorting if enabled
  const frecencyKey = config.frecencyKey || ((item: T) => config.generateTitle(item));
  const { data: frecencySortedItems, visitItem } = useFrecencySorting(postProcessedItems, {
    key: frecencyKey,
    namespace: config.frecencyNamespace || config.commandName,
  });

  // Use frecency-sorted items if enabled, otherwise use post-processed items
  const allItems = config.enableFrecency ? frecencySortedItems : postProcessedItems;

  // Compute warnings for all items
  const itemWarnings = useMemo(() => {
    if (!config.warningGenerator) return new Map<T, ItemWarning>();
    const warnings = new Map<T, ItemWarning>();
    for (const item of allItems) {
      const warning = config.warningGenerator(item, allItems);
      if (warning) {
        warnings.set(item, warning);
      }
    }
    return warnings;
  }, [allItems, config.warningGenerator]);

  // Filter items based on warning filter
  const filteredItems = useMemo(() => {
    if (warningFilter === "all" || !config.warningGenerator) return allItems;
    if (warningFilter === "warnings_only") {
      return allItems.filter((item) => itemWarnings.has(item));
    }
    // no_warnings
    return allItems.filter((item) => !itemWarnings.has(item));
  }, [allItems, warningFilter, itemWarnings, config.warningGenerator]);

  // Filter and group items
  const { searchText, setSearchText, grouped } = useZshrcFilter(filteredItems, config.searchFields);

  // Count warnings
  const warningCount = itemWarnings.size;

  // Generate overview actions
  const getOverviewActions = (): React.ReactNode => {
    if (config.generateOverviewActions) {
      const dummyItem = allItems[0] || ({} as T);
      const actions = config.generateOverviewActions(dummyItem, refresh);
      if (actions) return actions;
    }

    return (
      <ActionPanel>
        <SharedActionsSection onRefresh={refresh} />
      </ActionPanel>
    );
  };

  // Generate item actions with optional frecency tracking
  const getItemActions = (item: T): React.ReactNode => {
    if (config.generateItemActions) {
      // Pass visitItem callback if frecency is enabled
      const trackVisit = config.enableFrecency ? () => visitItem(item) : undefined;
      const actions = config.generateItemActions(item, refresh, trackVisit);
      if (actions) return actions;
    }

    return (
      <ActionPanel>
        <SharedActionsSection onRefresh={refresh} />
      </ActionPanel>
    );
  };

  // Default actions for empty state
  const getEmptyActions = (): React.ReactNode => {
    return (
      <ActionPanel>
        <SharedActionsSection onRefresh={refresh} />
      </ActionPanel>
    );
  };

  // Build the search bar accessory with warning filter if enabled
  const getSearchBarAccessory = (): List.Props["searchBarAccessory"] => {
    if (config.searchBarAccessory) {
      return config.searchBarAccessory as List.Props["searchBarAccessory"];
    }
    if (config.showWarningFilter && config.warningGenerator) {
      return (
        <List.Dropdown
          tooltip="Filter by Warnings"
          value={warningFilter}
          onChange={(newValue) => setWarningFilter(newValue as WarningFilter)}
        >
          <List.Dropdown.Item title="All Items" value="all" />
          <List.Dropdown.Item
            title={`With Warnings (${warningCount})`}
            value="warnings_only"
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Yellow }}
          />
          <List.Dropdown.Item title="Without Warnings" value="no_warnings" />
        </List.Dropdown>
      );
    }
    return undefined;
  };

  // Get warning accessory for an item
  const getWarningAccessory = (item: T): List.Item.Accessory | null => {
    const warning = itemWarnings.get(item);
    if (!warning) return null;
    return {
      icon: {
        source: warning.icon || Icon.ExclamationMark,
        tintColor: warning.color || Color.Yellow,
      },
      tooltip: warning.message,
    };
  };

  return (
    <List
      navigationTitle={config.navigationTitle}
      searchBarPlaceholder={config.searchPlaceholder}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={getSearchBarAccessory()}
      isLoading={isLoading}
      isShowingDetail={true}
      actions={
        <ActionPanel>
          <SharedActionsSection onRefresh={refresh} />
        </ActionPanel>
      }
    >
      <List.Section title="Overview">
        <List.Item
          title={`${config.itemType.charAt(0).toUpperCase() + config.itemType.slice(1)} Summary`}
          subtitle={`${allItems.length}`}
          icon={{ source: config.icon, tintColor: config.tintColor }}
          detail={
            <List.Item.Detail markdown={config.generateOverviewMarkdown(allItems[0] || ({} as T), allItems, grouped)} />
          }
          actions={getOverviewActions()}
        />
      </List.Section>

      {typeof config.customHeaderSection === "function"
        ? config.customHeaderSection(refresh)
        : config.customHeaderSection}

      {Object.entries(grouped).map(([sectionName, items]) => (
        <List.Section key={sectionName} title={sectionName}>
          {items.map((item) => {
            const warningAccessory = getWarningAccessory(item);
            const accessories: List.Item.Accessory[] = [];

            // Add warning accessory first if present
            if (warningAccessory) {
              accessories.push(warningAccessory);
            }

            // Add section and document accessories
            accessories.push({ text: sectionName });
            accessories.push({
              icon: {
                source: Icon.Document,
                tintColor: Color.SecondaryText,
              },
            });

            // Use the stable ID assigned during parsing for React keys
            // This ensures items are reordered (not remounted) when frecency changes
            const itemKey = `${sectionName}-${item._stableId}`;

            return (
              <List.Item
                key={itemKey}
                title={config.generateTitle(item)}
                icon={{ source: config.icon, tintColor: config.tintColor }}
                accessories={accessories}
                detail={
                  <List.Item.Detail
                    markdown={config.generateItemMarkdown(item, allItems, grouped)}
                    metadata={config.generateMetadata ? config.generateMetadata(item) : undefined}
                  />
                }
                actions={getItemActions(item)}
              />
            );
          })}
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
