import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { MeiliSearch } from "meilisearch";

const client = new MeiliSearch({
  host: "https://ms-909f535664f8-173.lon.meilisearch.io",
  apiKey: "776dc6a11c118bd1640c3a9ff9679f920bc384238534fc4861fcde0152e7fd68",
});

const index = client.index("production");

function truncate(text: string, length: number) {
  if (text.length <= length) {
    return text;
  }

  return text.substr(0, length) + "\u2026";
}

export default function Command() {
  const [searchResults, setSearchResults] = useState<Array<SearchResult> | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [showingDetail, setShowingDetail] = useState(false);

  const search = async (query = "") => {
    setIsLoading(true);

    return await index
      .search(truncate(query, 20))
      .then((res) => {
        setIsLoading(false);
        return res.hits as Array<SearchResult>;
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Meilisearch Search Error", err.message);
        return [];
      });
  };

  useEffect(() => {
    (async () => setSearchResults(await search()))();
  }, []);

  return (
    <List
      isLoading={isLoading || searchResults === undefined}
      isShowingDetail={showingDetail}
      onSearchTextChange={async (query) => setSearchResults(await search(query))}
      searchBarPlaceholder="Search in Meilisearch Documentation..."
      throttle
    >
      <List.Section
        title="Results"
        subtitle={
          searchResults?.length && searchResults?.length == 20
            ? searchResults?.length + "+"
            : searchResults?.length + ""
        }
      >
        {searchResults
          ?.filter((searchResult: SearchResult) => {
            return (
              searchResult.objectID &&
              (searchResult.hierarchy_lvl0 ||
                searchResult.hierarchy_lvl1 ||
                searchResult.hierarchy_lvl2 ||
                searchResult.hierarchy_lvl3 ||
                searchResult.hierarchy_lvl4 ||
                searchResult.hierarchy_lvl5)
            );
          })
          .map((searchResult) => {
            const hierarchyProperties = [];
            for (let i = 0; i <= 5; i++) {
              const property = searchResult[`hierarchy_lvl${i}` as keyof SearchResult];
              if (property) {
                hierarchyProperties.push(property);
              }
            }

            const name = hierarchyProperties.join(" > ");
            return (
              <List.Item
                key={searchResult.objectID}
                title={name}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      {searchResult.url ? (
                        <>
                          <Action.OpenInBrowser title="Open Documentation" url={searchResult.url} />
                          <Action.CopyToClipboard
                            title="Copy URL to Clipboard"
                            content={searchResult.url}
                            shortcut={{ modifiers: ["cmd"], key: "return" }}
                          />
                        </>
                      ) : null}
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Toggle Details"
                        icon={Icon.Sidebar}
                        onAction={() => setShowingDetail(!showingDetail)}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        {searchResult.hierarchy_lvl0 ? (
                          <List.Item.Detail.Metadata.Label title="Category" text={searchResult.hierarchy_lvl0} />
                        ) : null}
                        {searchResult.hierarchy_lvl1 ? (
                          <List.Item.Detail.Metadata.Label title="Title" text={searchResult.hierarchy_lvl1} />
                        ) : null}
                        {searchResult.hierarchy_lvl2 ? (
                          <List.Item.Detail.Metadata.Label title="Subtitle" text={searchResult.hierarchy_lvl2} />
                        ) : null}
                        {searchResult.hierarchy_lvl3 ? (
                          <List.Item.Detail.Metadata.Label title="Part" text={searchResult.hierarchy_lvl3} />
                        ) : null}
                        {searchResult.content ? (
                          <List.Item.Detail.Metadata.Label title="Content" text={searchResult.content} />
                        ) : null}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
              />
            );
          })}
      </List.Section>
    </List>
  );
}

/** Parse the response from the fetch query into something we can display */
interface SearchResult {
  objectID: string;
  hierarchy_lvl0?: string;
  hierarchy_lvl1?: string;
  hierarchy_lvl2?: string;
  hierarchy_lvl3?: string;
  hierarchy_lvl4?: string;
  hierarchy_lvl5?: string;
  content?: string;
  url: string;
}
