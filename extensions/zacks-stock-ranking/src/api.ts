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

export async function searchTickers(query: string): Promise<TickerSearchResult[]> {
  if (!query || query.length < 1) {
    return [];
  }

  try {
    const url = `${YAHOO_SEARCH_BASE}?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&listsCount=0`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      },
    });
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }
    const data: YahooSearchResponse = await response.json();
    // Filter to only stocks/ETFs and map to our format
    return data.quotes
      .filter((q) => q.quoteType === "EQUITY" || q.quoteType === "ETF")
      .map((q) => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
      }));
  } catch (error) {
    console.error("Ticker search error:", error);
    return [];
  }
}

export async function getZacksData(ticker: string): Promise<ZacksQuoteData | null> {
  try {
    const response = await fetch(`${ZACKS_QUOTE_BASE}?t=${encodeURIComponent(ticker.toUpperCase())}`);
    if (!response.ok) {
      throw new Error(`Zacks API failed: ${response.status}`);
    }
    const data: ZacksApiResponse = await response.json();
    const tickerData = data[ticker.toUpperCase()];
    return tickerData || null;
  } catch (error) {
    console.error("Zacks API error:", error);
    return null;
  }
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
