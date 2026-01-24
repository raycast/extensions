import { useState, useEffect, useMemo, useCallback } from "react";
import { Action, ActionPanel, List, Icon, showToast, Toast, Clipboard, Color } from "@raycast/api";
import type { AliasCollection } from "./hooks/useAliasCollections";
import type { ParsedAlias } from "./lib/parse-alias-file";
import { getSectionIcon } from "./lib/section-icons";
import { readZshrcFile } from "./lib/zsh";
import { addSingleAliasToZshrc, addAliasesToZshrc } from "./lib/section-writer";
import { SharedActionsSection } from "./lib/shared-actions";
import { getSourceAttribution, getSourceUrl } from "./lib/collection-fetcher";
import { parseAliases } from "./utils/parsers";

interface CollectionDetailProps {
  collection: AliasCollection;
  /** Callback to notify parent view that data has changed */
  onDataChange?: () => void;
}

/**
 * Collection Detail View
 *
 * Shows individual aliases from a collection, allowing users to
 * add specific aliases rather than the entire collection.
 */
export default function CollectionDetail({ collection, onDataChange }: CollectionDetailProps) {
  const [searchText, setSearchText] = useState("");
  const [existingAliasNames, setExistingAliasNames] = useState<Set<string>>(new Set());
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const icon = getSectionIcon(collection.icon || collection.id);

  // Load existing aliases from zshrc to check for duplicates
  // Re-runs when refreshKey changes (e.g., after undo)
  useEffect(() => {
    const loadExistingAliases = async () => {
      setIsLoadingExisting(true);
      try {
        const content = await readZshrcFile();
        const existingAliases = parseAliases(content);
        const names = new Set(existingAliases.map((a) => a.name));
        setExistingAliasNames(names);
      } catch {
        // If loading fails, continue with empty set
      } finally {
        setIsLoadingExisting(false);
      }
    };
    loadExistingAliases();
  }, [refreshKey]);

  // Refresh handler that reloads local state and notifies parent
  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    onDataChange?.();
  }, [onDataChange]);

  // Filter aliases based on search
  const filteredAliases = collection.aliases.filter((alias) => {
    const search = searchText.toLowerCase();
    return (
      alias.name.toLowerCase().includes(search) ||
      alias.value.toLowerCase().includes(search) ||
      (alias.description?.toLowerCase().includes(search) ?? false)
    );
  });

  // Count how many filtered aliases are not yet in zshrc
  const newAliasCount = useMemo(() => {
    return filteredAliases.filter((alias) => !existingAliasNames.has(alias.name)).length;
  }, [filteredAliases, existingAliasNames]);

  // Helper to check if an alias already exists
  const isExistingAlias = (aliasName: string) => existingAliasNames.has(aliasName);

  // Add single alias to zshrc (respects user's section format and merges with existing sections)
  const addAlias = async (alias: ParsedAlias) => {
    try {
      const result = await addSingleAliasToZshrc(alias, collection.name);

      // Update the existing aliases set to show the checkmark
      setExistingAliasNames((prev) => new Set([...prev, alias.name]));

      // Notify parent view that data changed so it can refresh
      onDataChange?.();

      await showToast({
        style: Toast.Style.Success,
        title: "Alias Added",
        message: result.message,
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Alias",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  // Copy single alias
  const copyAlias = async (alias: ParsedAlias) => {
    const aliasLine = `alias ${alias.name}='${alias.value.replace(/'/g, "'\"'\"'")}'`;
    await Clipboard.copy(aliasLine);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to Clipboard",
      message: alias.name,
    });
  };

  // Add all filtered aliases (respects user's section format and merges with existing sections)
  const addAllAliases = async () => {
    try {
      // Get attribution for the comment
      const attribution = getSourceAttribution(collection as Parameters<typeof getSourceAttribution>[0]);
      const result = await addAliasesToZshrc(collection.name, filteredAliases, attribution);

      // Update the existing aliases set to show checkmarks for all added aliases
      setExistingAliasNames((prev) => new Set([...prev, ...filteredAliases.map((a) => a.name)]));

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
        title: "Failed to Add Aliases",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  // Generate markdown for alias detail
  const getAliasMarkdown = (alias: ParsedAlias) => {
    // Get attribution for the collection
    const attribution = getSourceAttribution(collection as Parameters<typeof getSourceAttribution>[0]);
    const sourceUrl = getSourceUrl(collection as Parameters<typeof getSourceUrl>[0]);
    const attributionLine = sourceUrl ? `[${attribution}](${sourceUrl})` : attribution;

    return `
# \`${alias.name}\`

## Command
\`\`\`bash
${alias.value}
\`\`\`

${alias.description ? `## Description\n${alias.description}` : ""}

## Usage
Type \`${alias.name}\` in your terminal to execute:
\`\`\`bash
${alias.value}
\`\`\`

---
*From ${collection.name} - ${attributionLine}*
    `.trim();
  };

  return (
    <List
      navigationTitle={collection.name}
      searchBarPlaceholder={`Search ${collection.aliasCount} aliases...`}
      onSearchTextChange={setSearchText}
      isShowingDetail={true}
      isLoading={isLoadingExisting}
    >
      <List.Section
        title={`${collection.name} (${filteredAliases.length})`}
        subtitle={newAliasCount < filteredAliases.length ? `${newAliasCount} new` : ""}
      >
        {filteredAliases.map((alias, index) => {
          const alreadyExists = isExistingAlias(alias.name);
          return (
            <List.Item
              key={`${alias.name}-${index}`}
              title={alias.name}
              subtitle={alias.value.length > 40 ? alias.value.substring(0, 40) + "..." : alias.value}
              icon={{ source: icon.icon, tintColor: icon.color }}
              accessories={
                alreadyExists
                  ? [{ icon: { source: Icon.Checkmark, tintColor: Color.Green }, tooltip: "Already in your zshrc" }]
                  : []
              }
              detail={<List.Item.Detail markdown={getAliasMarkdown(alias)} />}
              actions={
                <ActionPanel>
                  <Action
                    title={alreadyExists ? "Add Anyway (Duplicate)" : "Add to Zshrc"}
                    icon={Icon.Plus}
                    onAction={() => addAlias(alias)}
                  />
                  <Action
                    title="Copy Alias"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onAction={() => copyAlias(alias)}
                  />
                  <Action
                    title={`Add All ${filteredAliases.length} Aliases`}
                    icon={Icon.PlusCircle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    onAction={addAllAliases}
                  />
                  <SharedActionsSection onRefresh={handleRefresh} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {filteredAliases.length === 0 && (
        <List.EmptyView
          title="No Aliases Found"
          description={searchText ? `No aliases matching "${searchText}"` : "This collection has no aliases"}
          icon={{ source: Icon.MagnifyingGlass }}
        />
      )}
    </List>
  );
}
