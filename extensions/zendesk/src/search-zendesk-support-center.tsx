// React imports
import { useEffect, useState } from "react";

// Library imports
import { NodeHtmlMarkdown } from "node-html-markdown";

// Raycast imports
import { Action, ActionPanel, getPreferenceValues, List, Icon, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

// interface/type definitions
import { Preferences, ArticleFetchRes, FilteredArticle, LocaleFetchRes, FilteredLocale } from "./types";

// get user Prefs
const { supportCenter }: Preferences = getPreferenceValues();

export default function ZendeskSearch() {
  const [query, setQuery] = useState("");
  const [locales, setLocales] = useState<FilteredLocale[]>([]);
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

  const { data }: LocaleFetchRes = useFetch(`https://${supportCenter}/api/v2/locales/`, {
    keepPreviousData: true,
    onData: (data) => {
      if (data) {
        return setLocales(
          data.locales.map((locale) => ({
            name: locale.name,
            locale: locale.locale,
          }))
        );
      }
    },
  });

  useEffect(() => {
    setSelectedLocale(locales[0]);
  }, [locales]);

  const {
    isLoading,
    data: articles,
    error,
  }: ArticleFetchRes = useFetch(
    `https://${supportCenter}/api/v2/help_center/articles/search.json?query=${query}&locale=${
      selectedLocale?.locale ? selectedLocale?.locale : ""
    }`,
    {
      keepPreviousData: true,
      onError: (error) => {
        if (error.message === "Bad Request") {
          return;
        }
        showToast({ title: "Error", message: error.message, style: Toast.Style.Failure });
      },
    }
  );

  const [searchResult, setSearchResult] = useState<FilteredArticle[] | undefined>(undefined);

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

  function getEmptyViewText() {
    if (isLoading) {
      return "Searching...";
    }
    if (query === "") {
      return "Start Typing to Search";
    }
    return "No Results";
  }

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search for an article..."
      isShowingDetail={!error && query !== ""}
      searchBarAccessory={locales && <LocaleDropdown />}
      throttle={true}
    >
      {searchResult ? (
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
