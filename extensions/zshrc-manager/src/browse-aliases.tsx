import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Action, ActionPanel, List, Icon, showToast, Toast, Clipboard } from "@raycast/api";
import { useAliasCollections, type AliasCollection, type CollectionMetadata } from "./hooks/useAliasCollections";
import { getSectionIcon } from "./lib/section-icons";
import { generateAliasSection } from "./lib/parse-alias-file";
import { getZshrcPath } from "./lib/zsh";
import { addAliasesToZshrc } from "./lib/section-writer";
import { getSourceAttribution, getSourceUrl } from "./lib/collection-fetcher";
import CollectionDetail from "./collection-detail";

interface BrowseAliasesProps {
  searchBarAccessory?: React.ReactElement;
  filterBySection?: string;
  /** Callback to notify parent view that data has changed */
  onDataChange?: () => void;
}

/**
 * Browse Alias Collections View
 *
 * Main view for browsing curated alias collections.
 * Framework-agnostic - shows "Git Aliases", not "OMZ Git Plugin".
 */
export default function BrowseAliases({ searchBarAccessory, filterBySection, onDataChange }: BrowseAliasesProps) {
  const { collections, loadedCollections, loadCollection, isLoading, manifestLoading, error } = useAliasCollections();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  // Debounce timer ref to prevent rapid loading during fast navigation
  const loadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable reference to loadedCollections for checking without triggering effects
  const loadedCollectionsRef = useRef(loadedCollections);
  loadedCollectionsRef.current = loadedCollections;

  // Store loadCollection in a ref for stable access without dependency
  const loadCollectionRef = useRef(loadCollection);
  loadCollectionRef.current = loadCollection;

  // Load collection when selected (debounced to prevent rapid state updates)
  useEffect(() => {
    if (!selectedId) return;

    // Clear any pending load
    if (loadDebounceRef.current) {
      clearTimeout(loadDebounceRef.current);
    }

    // Check if already loaded using ref (avoids dependency on Map reference)
    if (loadedCollectionsRef.current.has(selectedId)) {
      return;
    }

    // Debounce the load to prevent rapid firing during fast navigation
    loadDebounceRef.current = setTimeout(() => {
      // Double-check it's still not loaded
      if (!loadedCollectionsRef.current.has(selectedId)) {
        loadCollectionRef.current(selectedId);
      }
    }, 100); // 100ms debounce

    return () => {
      if (loadDebounceRef.current) {
        clearTimeout(loadDebounceRef.current);
      }
    };
  }, [selectedId]);

  // Filter collections based on search and optional section filter
  const filteredCollections = collections.filter((collection) => {
    const matchesSearch =
      collection.name.toLowerCase().includes(searchText.toLowerCase()) ||
      collection.category.toLowerCase().includes(searchText.toLowerCase());

    if (filterBySection) {
      // Match section name to collection id
      const sectionLower = filterBySection.toLowerCase();
      const idMatches = collection.id.toLowerCase().includes(sectionLower);
      const nameMatches = collection.name.toLowerCase().includes(sectionLower);
      return matchesSearch && (idMatches || nameMatches);
    }

    return matchesSearch;
  });

  // Group by category
  const byCategory = new Map<string, CollectionMetadata[]>();
  for (const collection of filteredCollections) {
    const existing = byCategory.get(collection.category) || [];
    byCategory.set(collection.category, [...existing, collection]);
  }

  // Apply collection to zshrc (respects user's section format and merges with existing sections)
  const applyCollection = async (collection: AliasCollection) => {
    try {
      // Get attribution for the comment
      const attribution = getSourceAttribution(collection as Parameters<typeof getSourceAttribution>[0]);
      const result = await addAliasesToZshrc(collection.name, collection.aliases, attribution);

      // Notify parent view that data changed so it can refresh
      onDataChange?.();

      await showToast({
        style: Toast.Style.Success,
        title: result.addedTo === "existing" ? "Added to Existing Section" : "Created New Section",
        message: result.message,
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Apply",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  // Copy collection content
  const copyCollection = async (collection: AliasCollection) => {
    const content = generateAliasSection(collection.name, collection.aliases);
    await Clipboard.copy(content);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to Clipboard",
      message: `${collection.aliasCount} aliases ready to paste`,
    });
  };

  // Generate markdown detail for collection
  const getDetailMarkdown = (collection: AliasCollection) => {
    const aliasLines = collection.aliases.slice(0, 30).map((a) => `- \`${a.name}\` → \`${a.value}\``);

    const remaining = collection.aliases.length - 30;
    if (remaining > 0) {
      aliasLines.push(`\n*... and ${remaining} more aliases*`);
    }

    // Build attribution section
    const attribution = getSourceAttribution(collection as Parameters<typeof getSourceAttribution>[0]);
    const sourceUrl = getSourceUrl(collection as Parameters<typeof getSourceUrl>[0]);
    const attributionLine = sourceUrl ? `[${attribution}](${sourceUrl})` : attribution;

    return `
# ${collection.name}

${collection.description}

**Source:** ${attributionLine}

## Aliases (${collection.aliasCount})

${aliasLines.join("\n")}
    `.trim();
  };

  // Generate markdown for unloaded collection
  const getPlaceholderMarkdown = (collection: CollectionMetadata) => {
    return `
# ${collection.name}

*Loading collection...*

Select this item to load the alias definitions.
    `.trim();
  };

  if (error) {
    return (
      <List searchBarAccessory={searchBarAccessory as List.Props["searchBarAccessory"]}>
        <List.EmptyView
          title="Error Loading Collections"
          description={error.message}
          icon={{ source: Icon.ExclamationMark }}
        />
      </List>
    );
  }

  return (
    <List
      navigationTitle={filterBySection ? `Aliases for ${filterBySection}` : "Browse Alias Collections"}
      searchBarPlaceholder="Search Collections..."
      searchBarAccessory={searchBarAccessory as List.Props["searchBarAccessory"]}
      onSearchTextChange={setSearchText}
      isShowingDetail={true}
      onSelectionChange={(id) => setSelectedId(id || null)}
    >
      {Array.from(byCategory.entries()).map(([category, categoryCollections]) => (
        <List.Section key={category} title={category}>
          {categoryCollections.map((collection) => {
            const loaded = loadedCollections.get(collection.id);
            const loading = isLoading(collection.id);
            const icon = getSectionIcon(collection.icon || collection.id);

            return (
              <List.Item
                key={collection.id}
                id={collection.id}
                title={collection.name}
                icon={{ source: icon.icon, tintColor: icon.color }}
                accessories={[
                  loading
                    ? { icon: Icon.CircleProgress }
                    : loaded
                      ? { text: `${loaded.aliasCount} aliases` }
                      : { icon: Icon.Download },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={loaded ? getDetailMarkdown(loaded) : getPlaceholderMarkdown(collection)}
                  />
                }
                actions={
                  <ActionPanel>
                    {loaded && (
                      <>
                        <Action.Push
                          title="View Aliases"
                          icon={Icon.List}
                          target={<CollectionDetail collection={loaded} {...(onDataChange && { onDataChange })} />}
                        />
                        <Action
                          title="Apply All to Zshrc"
                          icon={Icon.PlusCircle}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                          onAction={() => applyCollection(loaded)}
                        />
                        <Action
                          title="Copy All Aliases"
                          icon={Icon.Clipboard}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                          onAction={() => copyCollection(loaded)}
                        />
                      </>
                    )}
                    {!loaded && !loading && (
                      <Action
                        title="Load Collection"
                        icon={Icon.Download}
                        onAction={() => loadCollection(collection.id)}
                      />
                    )}
                    <Action.Open title="Open ~/.Zshrc" target={getZshrcPath()} icon={Icon.Document} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}

      {filteredCollections.length === 0 && (
        <List.EmptyView
          title={manifestLoading ? "Loading Collections..." : "No Collections Found"}
          description={
            manifestLoading
              ? "Fetching alias collections from repository"
              : searchText
                ? `No collections matching "${searchText}"`
                : "No collections available"
          }
          icon={{ source: manifestLoading ? Icon.CircleProgress : Icon.Book }}
        />
      )}
    </List>
  );
}
