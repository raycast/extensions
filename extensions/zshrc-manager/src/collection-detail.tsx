import { useState } from "react";
import { Action, ActionPanel, List, Icon, showToast, Toast, Clipboard } from "@raycast/api";
import type { AliasCollection } from "./hooks/useAliasCollections";
import type { ParsedAlias } from "./lib/parse-alias-file";
import { getSectionIcon } from "./lib/section-icons";
import { getZshrcPath } from "./lib/zsh";
import { addSingleAliasToZshrc, addAliasesToZshrc } from "./lib/section-writer";
import { getSourceAttribution, getSourceUrl } from "./lib/collection-fetcher";

interface CollectionDetailProps {
  collection: AliasCollection;
}

/**
 * Collection Detail View
 *
 * Shows individual aliases from a collection, allowing users to
 * add specific aliases rather than the entire collection.
 */
export default function CollectionDetail({ collection }: CollectionDetailProps) {
  const [searchText, setSearchText] = useState("");

  const icon = getSectionIcon(collection.icon || collection.id);

  // Filter aliases based on search
  const filteredAliases = collection.aliases.filter((alias) => {
    const search = searchText.toLowerCase();
    return (
      alias.name.toLowerCase().includes(search) ||
      alias.value.toLowerCase().includes(search) ||
      (alias.description?.toLowerCase().includes(search) ?? false)
    );
  });

  // Add single alias to zshrc (respects user's section format and merges with existing sections)
  const addAlias = async (alias: ParsedAlias) => {
    try {
      const result = await addSingleAliasToZshrc(alias, collection.name);

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
    >
      <List.Section title={`${collection.name} (${filteredAliases.length})`}>
        {filteredAliases.map((alias, index) => (
          <List.Item
            key={`${alias.name}-${index}`}
            title={alias.name}
            subtitle={alias.value.length > 40 ? alias.value.substring(0, 40) + "..." : alias.value}
            icon={{ source: icon.icon, tintColor: icon.color }}
            detail={<List.Item.Detail markdown={getAliasMarkdown(alias)} />}
            actions={
              <ActionPanel>
                <Action title="Add to Zshrc" icon={Icon.Plus} onAction={() => addAlias(alias)} />
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
                <Action.Open
                  title="Open ~/.Zshrc"
                  target={getZshrcPath()}
                  icon={Icon.Document}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              </ActionPanel>
            }
          />
        ))}
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
