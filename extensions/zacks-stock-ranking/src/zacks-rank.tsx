import { Action, ActionPanel, Detail, Icon, List, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getZacksData, getZacksRankColor, searchTickers, formatCurrency, formatPercent, formatNumber } from "./api";
import { RecentTicker, TickerSearchResult, ZacksQuoteData } from "./types";

const RECENTS_KEY = "recent-tickers";
const MAX_RECENTS = 10;

async function addToRecents(symbol: string, name: string) {
  const stored = await LocalStorage.getItem<string>(RECENTS_KEY);
  const recents: RecentTicker[] = stored ? JSON.parse(stored) : [];

  // Remove if already exists
  const filtered = recents.filter((r) => r.symbol !== symbol);

  // Add to front
  filtered.unshift({ symbol, name, timestamp: Date.now() });

  // Keep only MAX_RECENTS
  const trimmed = filtered.slice(0, MAX_RECENTS);

  await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(trimmed));
}

export function StockDetail({ ticker, name }: { ticker: string; name: string }) {
  const { data, isLoading, error } = useCachedPromise(
    async (symbol: string) => {
      const result = await getZacksData(symbol);
      if (result) {
        await addToRecents(symbol, name);
      }
      return result;
    },
    [ticker],
    { keepPreviousData: false },
  );

  if (error) {
    return <Detail markdown={`# Error\n\nFailed to fetch data for **${ticker}**:\n\n${error.message}`} />;
  }

  if (!data && !isLoading) {
    return <Detail markdown={`# Not Found\n\nNo data found for ticker **${ticker}**.`} />;
  }

  const markdown = data ? generateMarkdown(data) : `# Loading ${ticker}...`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={data ? <StockMetadata data={data} /> : undefined}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open on Zacks.com" url={`https://www.zacks.com/stock/quote/${ticker}`} />
          <Action.CopyToClipboard title="Copy Ticker" content={ticker} />
          {data && (
            <Action.CopyToClipboard
              title="Copy Price"
              content={formatCurrency(data.last)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function generateMarkdown(data: ZacksQuoteData): string {
  const change = parseFloat(data.net_change);
  const changeEmoji = isNaN(change) ? "" : change >= 0 ? "📈" : "📉";
  const rankEmoji = getRankEmoji(data.zacks_rank);

  return `# ${data.name} (${data.ticker})

## ${formatCurrency(data.last)} ${changeEmoji}
**Change:** ${formatCurrency(data.net_change)} (${formatPercent(data.percent_net_change)})

---

## Zacks Rank: ${data.zacks_rank} - ${data.zacks_rank_text} ${rankEmoji}

| Metric | Value |
|--------|-------|
| **P/E Ratio** | ${formatNumber(data.SUNGARD_PE_RATIO)} |
| **EPS** | ${formatCurrency(data.SUNGARD_EPS)} |
| **Market Cap** | ${formatNumber(data.SUNGARD_MARKET_CAP)} |
| **Previous Close** | ${formatCurrency(data.previous_close)} |
| **52 Week Range** | ${formatCurrency(data.SUNGARD_YRLOW)} - ${formatCurrency(data.SUNGARD_YRHIGH)} |
`;
}

function StockMetadata({ data }: { data: ZacksQuoteData }) {
  const rankColor = getZacksRankColor(data.zacks_rank);

  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Zacks Rank">
        <Detail.Metadata.TagList.Item text={`${data.zacks_rank} - ${data.zacks_rank_text}`} color={rankColor} />
      </Detail.Metadata.TagList>

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label title="Previous Close" text={formatCurrency(data.previous_close)} />
      <Detail.Metadata.Label title="Open" text={formatCurrency(data.SUNGARD_OPEN)} />
      <Detail.Metadata.Label
        title="Bid / Ask"
        text={`${formatCurrency(data.SUNGARD_BID)} / ${formatCurrency(data.SUNGARD_ASK)}`}
      />

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label title="Dividend" text={formatCurrency(data.source?.sungard?.dividend ?? "")} />
      <Detail.Metadata.Label title="Yield" text={data.dividend_yield ? `${data.dividend_yield}%` : "N/A"} />

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label title="Last Updated" text={data.updated || "N/A"} />

      <Detail.Metadata.Separator />

      <Detail.Metadata.Link
        title="View on Zacks"
        target={`https://www.zacks.com/stock/quote/${data.ticker}`}
        text="zacks.com"
      />
    </Detail.Metadata>
  );
}

function getRankEmoji(rank: string): string {
  switch (rank) {
    case "1":
      return "🟢";
    case "2":
      return "🟢";
    case "3":
      return "🟡";
    case "4":
      return "🟠";
    case "5":
      return "🔴";
    default:
      return "⚪";
  }
}

export default function SearchZacksRank() {
  const [searchText, setSearchText] = useState("");

  const { data: searchResults, isLoading } = useCachedPromise(
    async (query: string) => {
      if (!query || query.length < 1) return [];
      return searchTickers(query);
    },
    [searchText],
    { keepPreviousData: true },
  );

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
                    target={<StockDetail ticker={result.symbol} name={result.name} />}
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
