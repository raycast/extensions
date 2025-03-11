import { List, ActionPanel, Action, Icon, Toast, showToast, Clipboard, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { ZoteroItem } from "../background";

interface CitationListProps {
  items?: ZoteroItem[];
  isLoading?: boolean;
  error?: string | null;
}

export default function CitationList({
  items = [],
  isLoading = false,
  error = null,
}: CitationListProps) {
  const [state, setState] = useState<{
    isLoading: boolean;
    searchText: string;
    items: ZoteroItem[];
    error: string | null;
  }>({
    isLoading: isLoading,
    searchText: "",
    items: items,
    error: error,
  });

  useEffect(() => {
    setState((prev) => ({ ...prev, items, isLoading, error }));
  }, [items, isLoading, error]);

  async function copyToClipboard(text: string, description: string) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Copying...",
      });

      await Clipboard.copy(text);

      await showToast({
        style: Toast.Style.Success,
        title: "Copied!",
        message: description,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy",
        message: "Please try again",
      });
    }
  }

  function formatInTextCitation(item: ZoteroItem): string {
    if (!item.data) {
      return "(Unknown, n.d.)";
    }

    const authors = item.data.creators?.filter((c) => c.creatorType === "author") || [];
    const firstName = authors[0]?.lastName || "Unknown";
    const year = item.data.date ? item.data.date.substring(0, 4) : "n.d.";

    return authors.length <= 1 ? `(${firstName}, ${year})` : `(${firstName} et al., ${year})`;
  }

  function formatBibliographyEntry(item: ZoteroItem): string {
    if (!item.data) {
      return "Unknown. (n.d.). Untitled.";
    }

    const authors = item.data.creators?.filter((c) => c.creatorType === "author") || [];
    const authorString =
      authors.length > 0
        ? authors
            .map(
              (a) =>
                `${a.lastName || "Unknown"}, ${a.firstName ? a.firstName.charAt(0) + "." : ""}`,
            )
            .join(", ")
        : "Unknown";

    const year = item.data.date ? item.data.date.substring(0, 4) : "n.d.";
    const title = item.data.title || "Untitled";
    const publication = item.data.publicationTitle ? `. ${item.data.publicationTitle}` : "";

    return `${authorString} (${year}). ${title}${publication}.`;
  }

  const filteredItems = state.searchText
    ? state.items.filter((item) => {
        const title = item.data?.title?.toLowerCase() || "";
        const searchLower = state.searchText.toLowerCase();
        const creatorMatch = item.data?.creators?.some((creator) => {
          const fullName = `${creator.firstName || ""} ${creator.lastName || ""}`.toLowerCase();
          return fullName.includes(searchLower);
        });

        return title.includes(searchLower) || creatorMatch;
      })
    : state.items;

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={(text) => setState((prev) => ({ ...prev, searchText: text }))}
      searchBarPlaceholder="Search by title or author..."
      throttle
    >
      {state.error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Error loading citations"
          description={state.error}
        />
      ) : filteredItems.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No items found"
          description={
            state.searchText ? "Try a different search term" : "Your library appears to be empty"
          }
        />
      ) : (
        filteredItems.map((item) => {
          const bibEntry = formatBibliographyEntry(item);
          return (
            <List.Item
              key={item.key}
              icon={getItemTypeIcon(item.data?.itemType)}
              title={bibEntry}
              accessories={[
                {
                  tag: {
                    value: item.data?.date ? item.data.date.substring(0, 4) : "n.d.",
                    color: Color.Blue,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="Copy Bibliography Entry"
                      icon={Icon.TextDocument}
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                      onAction={() =>
                        copyToClipboard(bibEntry, "Bibliography entry copied to clipboard")
                      }
                    />
                    <Action
                      title="Copy In-text Citation"
                      icon={Icon.Text}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                      onAction={() => {
                        const citation = formatInTextCitation(item);
                        copyToClipboard(citation, "Citation copied to clipboard");
                      }}
                    />
                    <Action
                      title="Copy Title Only"
                      icon={Icon.TextDocument}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                      onAction={() =>
                        copyToClipboard(item.data?.title || "Untitled", "Title copied to clipboard")
                      }
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function getItemTypeIcon(itemType?: string): Icon {
  switch (itemType?.toLowerCase()) {
    case "book":
      return Icon.Book;
    case "journalarticle":
      return Icon.Document;
    case "conferencepaper":
      return Icon.Note;
    case "thesis":
      return Icon.Star;
    case "webpage":
      return Icon.Globe;
    default:
      return Icon.Document;
  }
}
