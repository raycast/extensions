import { useFetch } from "@raycast/utils";
import { TickerSearchResult, ZacksApiResponse, ZacksQuoteData } from "./types";

const YAHOO_SEARCH_BASE = "https://query1.finance.yahoo.com/v1/finance/search";
const ZACKS_QUOTE_BASE = "https://quote-feed.zacks.com/index";

interface YahooQuote {
  symbol: string;
  shortname?: string;
  longname?: string;
  quoteType: string;
  exchange: string;
}

interface YahooSearchResponse {
  quotes: YahooQuote[];
}

// Helper to format the Zacks rank with color
export function getZacksRankColor(rank: string): string {
  switch (rank) {
    case "1":
      return "#00C805"; // Strong Buy - Green
    case "2":
      return "#7CB342"; // Buy - Light Green
    case "3":
      return "#FFC107"; // Hold - Yellow
    case "4":
      return "#FF9800"; // Sell - Orange
    case "5":
      return "#F44336"; // Strong Sell - Red
    default:
      return "#9E9E9E"; // Unknown - Gray
  }
}

// Format large numbers (market cap, volume)
export function formatNumber(value: string): string {
  if (!value || value === "NA" || value === "-") return "N/A";
  return value;
}

// Format percentage
export function formatPercent(value: string): string {
  if (!value || value === "NA" || value === "-") return "N/A";
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
}

// Format currency
export function formatCurrency(value: string): string {
  if (!value || value === "NA" || value === "-") return "N/A";
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return `$${num.toFixed(2)}`;
}

// Hook for searching tickers using useFetch
export function useTickerSearch(query: string) {
  return useFetch<TickerSearchResult[]>(
    `${YAHOO_SEARCH_BASE}?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&listsCount=0`,
    {
      execute: query.length >= 1,
      keepPreviousData: true,
      async parseResponse(response) {
        const result: YahooSearchResponse = await response.json();
        return result.quotes
          .filter((q) => q.quoteType === "EQUITY" || q.quoteType === "ETF")
          .map((q) => ({
            symbol: q.symbol,
            name: q.longname || q.shortname || q.symbol,
          }));
      },
    },
  );
}

// Hook for fetching Zacks data using useFetch
export function useZacksData(ticker: string) {
  const symbol = ticker.toUpperCase();

  return useFetch<ZacksQuoteData | null>(`${ZACKS_QUOTE_BASE}?t=${encodeURIComponent(symbol)}`, {
    execute: ticker.length > 0,
    keepPreviousData: false,
    async parseResponse(response) {
      const result: ZacksApiResponse = await response.json();
      return result[symbol] || null;
    },
  });
}
