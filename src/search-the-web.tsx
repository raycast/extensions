import { useState, useEffect, useReducer } from "react";
import { getFavicon, useFetch } from "@raycast/utils";
import { Action, ActionPanel, Clipboard, Detail, getPreferenceValues, Icon, List, useNavigation } from "@raycast/api";
import AddSearchEngine from "./add-search-engine";
import { decode as htmlDecode } from "he";
import { URL, URLSearchParams } from "node:url";
import { getSavedSites } from "./saved-sites";

interface Preferences {
  prefillFromClipboard: boolean;
}

function suggestionsFromXml(xml: string): string[] {
  const suggestionMatches = xml.matchAll(/<suggestion data="(.*?)"\/>/g);
  const suggestions: string[] = [];

  for (const match of suggestionMatches) {
    const suggestion = match[1]; // capture group 1
    suggestions.push(htmlDecode(suggestion));
  }

  return suggestions;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    if (getPreferenceValues<Preferences>().prefillFromClipboard) {
      Clipboard.readText().then((text) => {
        setSearchText(text ?? "");
        // updateSuggestions(searchText);
      });
    }
  }, []);

  const [savedSites, setSavedSites] = useState(getSavedSites());
  const [selectedSite, setSelectedSiteTitle] = useState<string | undefined>();

  const urlToSite = Object.fromEntries(savedSites.items.map(({ title, url }) => [url, title]));

  const { isLoading, data } = useFetch<string[] | string, void>(
    `https://google.com/complete/search?output=toolbar&q=${encodeURIComponent(searchText)}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
      },
      execute: true,
      // to make sure the screen isn't flickering when the searchText changes
      keepPreviousData: true,
      parseResponse: async (response) => {
        const url = new URL(response.url);
        const queryParams = new URLSearchParams(url.search);
        const query = queryParams.get("q") ?? "";
        if (query === "") {
          return [];
        }

        if (!(200 <= response.status && response.status < 300)) {
          return `${response.status}: ${response.statusText}`;
        }

        const xml = await response.text();
        const suggestions = suggestionsFromXml(xml);

        return suggestions;
      },
    }
  );

  const defaultActions = (
    <ActionPanel.Section title="Manage sites">
      <Action.Push
        target={<AddSearchEngine {...{ savedSites, setSavedSites, forceUpdate }} />}
        title="Add search engine..."
        icon={Icon.Plus}
      ></Action.Push>
      <Action title="Manage search engines..." icon={Icon.Gear}></Action>
    </ActionPanel.Section>
  );

  const defaultActionPanel = <ActionPanel title="Title">{defaultActions}</ActionPanel>;

  const searchSuggestionsList = (
    <List
      enableFiltering={false}
      isLoading={isLoading}
      throttle={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search site"
          storeValue={true}
          onChange={(newUrl) => setSelectedSiteTitle(urlToSite[newUrl])}
        >
          {savedSites.items.map(({ title, url }, i) => (
            <List.Dropdown.Item {...{ title, key: i, value: url, icon: getFavicon(url) }}></List.Dropdown.Item>
          ))}
        </List.Dropdown>
      }
      actions={<ActionPanel>{defaultActions}</ActionPanel>}
    >
      {typeof data === "string" ? (
        <List.Item
          key={data}
          title={`Error: Could not load search suggestions, but you can still search for the above text.`}
          accessories={[{ text: `${data}`, icon: Icon.Warning }]}
          actions={defaultActionPanel}
        ></List.Item>
      ) : (
        (data ?? []).map((item) => (
          <List.Item
            key={item}
            title={item}
            actions={
              <ActionPanel>
                <Action title={`Search on ${selectedSite}`} icon={Icon.MagnifyingGlass}></Action>
                {defaultActions}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );

  if (savedSites.items.length === 0) {
    return <AddSearchEngine {...{ savedSites, setSavedSites }} />;
  }

  return searchSuggestionsList;
}
