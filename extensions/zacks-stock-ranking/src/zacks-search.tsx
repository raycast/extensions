import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { useTickerSearch } from "./api";
import { TickerSearchResult } from "./types";
import { StockDetailView } from "./components/StockDetailView";

export default function SearchZacksRank() {
  const [searchText, setSearchText] = useState("");

  const { data: searchResults, isLoading } = useTickerSearch(searchText);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for a stock ticker..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {searchResults && searchResults.length > 0 ? (
        <List.Section title="Search Results" subtitle={`${searchResults.length} results`}>
          {searchResults.map((result: TickerSearchResult) => (
            <List.Item
              key={result.symbol}
              title={result.symbol}
              subtitle={result.name}
              icon={{
                source: `https://assets.parqet.com/logos/symbol/${result.symbol}`,
                fallback: Icon.Building,
              }}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Stock Details"
                    icon={Icon.Eye}
                    target={<StockDetailView ticker={result.symbol} name={result.name} />}
                  />
                  <Action.OpenInBrowser
                    title="Open on Zacks.com"
                    url={`https://www.zacks.com/stock/quote/${result.symbol}`}
                  />
                  <Action.CopyToClipboard title="Copy Ticker" content={result.symbol} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : searchText.length > 0 && !isLoading ? (
        <List.EmptyView
          title="No Results"
          description={`No tickers found for "${searchText}"`}
          icon={Icon.MagnifyingGlass}
        />
      ) : (
        <List.EmptyView
          title="Search for a Stock"
          description="Type a ticker symbol or company name"
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}
