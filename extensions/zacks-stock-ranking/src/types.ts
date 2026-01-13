// Ticker search autocomplete API response
export interface TickerSearchResult {
  symbol: string;
  name: string;
}

export interface TickerSearchResponse {
  results: TickerSearchResult[];
  message?: string;
}

// Nested source data from Zacks API
export interface SungardSourceData {
  dividend: string;
  yield: string;
  dividend_freq: string;
  dividend_date: string;
}

export interface ZacksSourceData {
  sungard?: SungardSourceData;
}

// Zacks quote-feed API response (actual field names from API)
export interface ZacksQuoteData {
  // Price & Trading
  last: string;
  previous_close: string;
  net_change: string;
  percent_net_change: string;
  updated: string;

  // Company Info
  ticker: string;
  name: string;
  exchange: string;
  market_status: string;

  // SunGard data
  SUNGARD_OPEN: string;
  SUNGARD_CLOSE: string;
  SUNGARD_BID: string;
  SUNGARD_ASK: string;
  SUNGARD_VOLUME: string;
  SUNGARD_PE_RATIO: string;
  SUNGARD_MARKET_CAP: string;
  SUNGARD_YRHIGH: string;
  SUNGARD_YRLOW: string;
  SUNGARD_EPS: string;
  SUNGARD_SHARES: string;

  // Zacks Ratings
  zacks_rank: string;
  zacks_rank_text: string;

  // Dividend
  dividend_yield: string;

  // Nested source data (contains accurate dividend info)
  source?: ZacksSourceData;
}

export interface ZacksApiResponse {
  [ticker: string]: ZacksQuoteData;
}

// Stored recent ticker
export interface RecentTicker {
  symbol: string;
  name: string;
  timestamp: number;
}
