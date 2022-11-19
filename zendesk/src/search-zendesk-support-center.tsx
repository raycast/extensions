// React imports
import { useEffect, useState } from "react";

// Library imports
import { NodeHtmlMarkdown } from "node-html-markdown";

// Raycast imports
import { Action, ActionPanel, getPreferenceValues, List, Icon, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

// interface/type definitions
import { Preferences, ArticleFetchRes, FilteredArticle } from "./types";

// get user Prefs
const { supportCenter, locale = "en-us" }: Preferences = getPreferenceValues();

export default function ZendeskSearch() {
  const [query, setQuery] = useState("");

  const {
    isLoading,
    data: articles,
    error,
  }: ArticleFetchRes = useFetch(`https://${supportCenter}/api/v2/help_center/articles/search.json?query=${query}`, {
    keepPreviousData: true,
    onError: (error) => {
      if (error.message === "Bad Request") {
        return;
      }
      showToast({ title: "Error", message: error.message, style: Toast.Style.Failure });
    },
  });
  const [searchResult, setSearchResult] = useState<FilteredArticle[] | undefined>(undefined);

  function getEmptyViewText() {
    if (isLoading) {
      return "Searching...";
    }
    if (query === "") {
      return "Start Typing to Search";
    }
    return "No Results";
  }

  useEffect(() => {
    if (articles && articles.results.length > 0) {
      const results = articles.results.map((item) => ({
        url: item.html_url,
        title: item.title,
        id: item.id,
        section: item.section_id,
        body: NodeHtmlMarkdown.translate(item?.body || "<p>Article has no text.</p>"),
      }));
      setSearchResult(results);
    }
  }, [articles]);

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search for an article..."
      isShowingDetail={!error && query !== ""}
      throttle={true}
    >
      {searchResult ? (
        searchResult.map((item) => {
          if (item.url === undefined) return;
          return (
            <List.Item
              title={item.title}
              detail={<List.Item.Detail markdown={item.body} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={`https://${supportCenter}/hc/${locale}/articles/${item.id}`}
                  />
                  <Action.CopyToClipboard content={item.url} shortcut={{ modifiers: ["cmd"], key: "enter" }} />
                  <Action.Paste content={item.url} shortcut={{ modifiers: ["cmd"], key: "." }} />
                </ActionPanel>
              }
            />
          );
        })
      ) : (
        <List.EmptyView
          title={getEmptyViewText()}
          icon={Icon.AppWindowList}
          actions={
            <ActionPanel>
              <Action title="Search for Article" icon={Icon.Binoculars} />;
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
