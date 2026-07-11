// React imports
import { useState } from "react";

// Library imports
import { NodeHtmlMarkdown } from "node-html-markdown";

// Raycast imports
import { Action, ActionPanel, getPreferenceValues, List, Icon } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";

// interface/type definitions
import { ArticleFetchRes, FilteredArticle, LocaleFetchRes, FilteredLocale } from "./types";

// get user Prefs
const { supportCenter } = getPreferenceValues<Preferences>();

export default function ZendeskSearch() {
  const [query, setQuery] = useState("");
  const [selectedLocale, setSelectedLocale] = useState<FilteredLocale>();

  const LocaleDropdown = () => (
    <List.Dropdown
      tooltip="Select Locale"
      storeValue={true}
      onChange={(newValue) => {
        setSelectedLocale(locales.find((locale) => locale.locale === newValue));
      }}
    >
      <List.Dropdown.Section title="Available Locales">
        {locales.map((locale) => (
          <List.Dropdown.Item key={locale.name} title={locale.name} value={locale.locale} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  const { data: locales } = useFetch(`https://${supportCenter}/api/v2/locales/`, {
    mapResult(result: LocaleFetchRes) {
      const results: FilteredLocale[] = result.locales.map((locale) => ({
        name: locale.name,
        locale: locale.locale,
      }));
      return {
        data: results,
      };
    },
    onData(data) {
      setSelectedLocale(data[0]);
    },
    keepPreviousData: true,
    initialData: [],
  });

  const {
    isLoading,
    data: searchResult,
    error,
    pagination,
  } = useFetch(
    (options) =>
      `https://${supportCenter}/api/v2/help_center/articles/search.json?query=${query}&page=${
        options.page + 1
      }&locale=${selectedLocale?.locale ? selectedLocale?.locale : ""}`,
    {
      keepPreviousData: true,
      mapResult(result: ArticleFetchRes) {
        const results: FilteredArticle[] = result.results.map((item) => ({
          url: item.html_url,
          html_url: item.html_url,
          title: item.title,
          id: item.id,
          section: item.section_id,
          body: NodeHtmlMarkdown.translate(item?.body || "<p>Article has no text.</p>"),
        }));
        return {
          data: results,
          hasMore: !!result.next_page,
        };
      },
      initialData: [],
      onError: async (error) => {
        if (error.message === "Bad Request") {
          return;
        }
        await showFailureToast(error, { title: "Error" });
      },
    }
  );

  function getEmptyViewText() {
    if (isLoading) {
      return "Searching...";
    }
    if (query === "") {
      return "Start Typing to Search";
    }
    return "No Results";
  }

  const isShowingDetail = !error && query !== "";

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search for an article..."
      isShowingDetail={isShowingDetail}
      searchBarAccessory={<LocaleDropdown />}
      throttle={true}
      pagination={pagination}
    >
      {searchResult.length && isShowingDetail ? (
        searchResult.map((item) => {
          if (item.url === undefined) {
            return null;
          }
          return (
            <List.Item
              key={item.title}
              title={item.title}
              detail={<List.Item.Detail markdown={item.body} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.url} />
                  <Action.CopyToClipboard content={item.url} />
                  <Action.Paste content={item.url} shortcut={{ modifiers: ["cmd"], key: "." }} />
                </ActionPanel>
              }
            />
          );
        })
      ) : (
        <List.EmptyView title={getEmptyViewText()} icon={Icon.AppWindowList} />
      )}
    </List>
  );
}
