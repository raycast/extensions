import { Action, ActionPanel, List, getPreferenceValues, showToast, Toast, Icon } from "@raycast/api";
import React from "react";
import fetch from "node-fetch";

interface ExaSearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  score: number;
  published_date?: string;
}

interface ExaSearchResponse {
  results: ExaSearchResult[];
}

export default function Command() {
  const [searchText, setSearchText] = React.useState("");
  const [results, setResults] = React.useState<ExaSearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const minQueryLength = 3;

  const preferences = getPreferenceValues<Preferences>();

  async function searchExa(query: string) {
    console.log("Searching with query:", query);
    if (!query || query.trim().length < minQueryLength) {
      console.log("Query too short, skipping search");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Making API request...");
      const response = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": preferences.exaApiKey,
        },
        body: JSON.stringify({
          query: query.trim(),
          num_results: 10,
          use_autoprompt: true,
          include_domains: [],
          exclude_domains: [],
          source_type: "search",
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("API error:", response.status, errorBody);
        throw new Error(`API error ${response.status}: ${errorBody}`);
      }

      const data = (await response.json()) as ExaSearchResponse;
      console.log("Got results:", data.results?.length ?? 0);
      setResults(data.results || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      console.error("Search error:", errorMessage);
      setError(errorMessage);
      showToast(Toast.Style.Failure, "Search failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearchTextChange(newText: string) {
    console.log("Search text changed:", newText);
    setSearchText(newText);
    if (!newText.trim()) {
      setResults([]);
    }
  }

  // Add a search trigger when the component mounts if there's initial search text
  React.useEffect(() => {
    if (searchText.trim().length >= minQueryLength) {
      searchExa(searchText);
    }
  }, []); // Only run once on mount

  const emptyView = React.useMemo(() => {
    if (error) {
      return <List.EmptyView icon={Icon.ExclamationMark} title="Error" description={error} />;
    }

    return (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={
          !searchText.trim()
            ? "Enter your search terms"
            : searchText.trim().length < minQueryLength
              ? `Type at least ${minQueryLength} characters`
              : "Press ↵ to search"
        }
        description="Press ↵ to search"
      />
    );
  }, [error, searchText, minQueryLength]);

  const renderActionPanel = (item?: ExaSearchResult) => (
    <ActionPanel>
      <ActionPanel.Section>
        {item && (
          <>
            <Action.OpenInBrowser url={item.url} />
            <Action.CopyToClipboard content={item.url} title="Copy Link" shortcut={{ modifiers: ["cmd"], key: "c" }} />
          </>
        )}
        <Action
          title="Search"
          onAction={() => {
            console.log("Search action triggered");
            searchExa(searchText);
          }}
          shortcut={{ modifiers: [], key: "return" }}
          icon={Icon.MagnifyingGlass}
        />
        <Action.OpenInBrowser
          title="View Exa Api Documentation"
          url="https://docs.exa.ai/reference/search"
          icon={Icon.Document}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Type and press ↵ to search with Exa AI..."
      throttle
      actions={renderActionPanel()}
    >
      {results.length === 0
        ? emptyView
        : results.map((item) => (
            <List.Item
              key={item.id}
              icon={Icon.Link}
              title={item.title}
              subtitle={item.snippet}
              accessories={[
                {
                  text: item.published_date ? new Date(item.published_date).toLocaleDateString() : undefined,
                },
              ]}
              actions={renderActionPanel(item)}
            />
          ))}
    </List>
  );
}
