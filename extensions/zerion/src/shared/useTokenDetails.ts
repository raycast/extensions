import { useMemo } from "react";
import { useFetch, usePromise } from "@raycast/utils";
import {
  API_URL,
  apiFetch,
  getApiHeaders,
  parseApiResponse,
  type ApiChartAttributes,
  type ApiFungible,
  type ApiWalletPnlResponse,
} from "./api";
import { ALL_CHAINS } from "./constants";

export interface MarketData {
  price: number | null;
  marketCap: number | null;
  fullyDilutedValuation: number | null;
  volume1d: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  changes: { label: string; percent: number | null }[];
  links: { name: string; url: string }[];
  description: string | null;
}

function mapMarketData(fungible: ApiFungible): MarketData {
  const { market_data, external_links, implementations, description } = fungible.attributes;
  const implementationsVolume = implementations
    .map((implementation) => implementation.market_data?.trading_volumes?.volume_1d)
    .filter((volume): volume is number => typeof volume === "number");
  return {
    price: market_data.price ?? null,
    marketCap: market_data.market_cap ?? null,
    fullyDilutedValuation: market_data.fully_diluted_valuation ?? null,
    volume1d:
      market_data.trading_volumes?.volume_1d ??
      (implementationsVolume.length ? implementationsVolume.reduce((sum, volume) => sum + volume, 0) : null),
    circulatingSupply: market_data.circulating_supply ?? null,
    totalSupply: market_data.total_supply ?? null,
    changes: [
      { label: "1D", percent: market_data.changes?.percent_1d ?? null },
      { label: "30D", percent: market_data.changes?.percent_30d ?? null },
      { label: "90D", percent: market_data.changes?.percent_90d ?? null },
      { label: "1Y", percent: market_data.changes?.percent_365d ?? null },
    ],
    links: (external_links ?? [])
      .filter((link) => Boolean(link.url))
      .map((link) => ({ name: link.name || link.type || "Link", url: link.url })),
    description: description || null,
  };
}

async function parseMarketData(response: Response): Promise<MarketData> {
  const result = await parseApiResponse<{ data: ApiFungible }>(response);
  return mapMarketData(result.data);
}

export function useMarketData({ fungibleId, execute }: { fungibleId: string; execute: boolean }) {
  const { data, isLoading, error } = useFetch<MarketData>(
    `${API_URL}fungibles/${encodeURIComponent(fungibleId)}?currency=usd`,
    useMemo(
      () => ({
        headers: getApiHeaders(),
        parseResponse: parseMarketData,
        execute,
        onError: (error: Error) => {
          console.error(error);
        },
      }),
      [fungibleId, execute],
    ),
  );
  return { marketData: data, isLoading: execute && isLoading, error };
}

export interface TokenChart {
  /** [timestamp in ms, usd price], oldest first */
  points: [number, number][];
}

async function parseTokenChart(response: Response): Promise<TokenChart> {
  const result = await parseApiResponse<{ data: { attributes: ApiChartAttributes } }>(response);
  return { points: result.data.attributes.points.map(([timestamp, price]) => [timestamp * 1000, price]) };
}

/** Price over the last 24 hours; Token Details always show the day chart */
export function useTokenDayChart({ fungibleId, execute }: { fungibleId: string; execute: boolean }) {
  const { data, isLoading, error } = useFetch<TokenChart>(
    `${API_URL}fungibles/${encodeURIComponent(fungibleId)}/charts/day?currency=usd`,
    useMemo(
      () => ({
        headers: getApiHeaders(),
        parseResponse: parseTokenChart,
        execute,
        onError: (error: Error) => {
          console.error(error);
        },
      }),
      [fungibleId, execute],
    ),
  );
  return { chart: data, isLoading: execute && isLoading, error };
}

export interface TokenPnl {
  totalGain: number;
  /** Percent, null when nothing was invested so a return can't be expressed */
  totalGainPercent: number | null;
  realizedGain: number;
  unrealizedGain: number;
  totalInvested: number;
  netInvested: number;
  averageBuyPrice: number | null;
}

function mapTokenPnl(response: ApiWalletPnlResponse, breakdownKey: string): TokenPnl {
  const { attributes } = response.data;
  // A single-token request usually answers with the totals only; the breakdown
  // (with average prices) appears for implementation filters and multi-id requests.
  const breakdown =
    attributes.breakdown?.by_id?.[breakdownKey] ?? attributes.breakdown?.by_implementation?.[breakdownKey];
  const stats = breakdown ?? attributes;
  return {
    totalGain: stats.total_gain,
    totalGainPercent: stats.total_invested > 0 ? stats.relative_total_gain_percentage : null,
    realizedGain: stats.realized_gain,
    unrealizedGain: stats.unrealized_gain,
    totalInvested: stats.total_invested,
    netInvested: stats.net_invested,
    averageBuyPrice: breakdown?.average_buy_price ?? null,
  };
}

// PnL is the expensive call, so a fetched result lives for the whole command
// session: re-selecting a row never re-requests it.
const pnlCache = new Map<string, Promise<TokenPnl>>();

function fetchTokenPnl(path: string, breakdownKey: string) {
  let request = pnlCache.get(path);
  if (!request) {
    request = apiFetch<ApiWalletPnlResponse>(path).then((response) => mapTokenPnl(response, breakdownKey));
    request.catch(() => pnlCache.delete(path));
    pnlCache.set(path, request);
  }
  return request;
}

/**
 * The wallet's Token PnL for one fungible, following the Wallet Overview's
 * chain filter.
 *
 * The API refuses `filter[fungible_ids]` combined with `filter[chain_ids]`
 * (503), so a selected chain is expressed through that chain's implementation
 * (`chain:address`) instead. Without a matching implementation the PnL is
 * `unavailable` rather than silently widened to every chain.
 */
export function useTokenPnl({
  address,
  fungibleId,
  implementations,
  chain,
  execute,
}: {
  address: string;
  fungibleId: string;
  implementations: { chainId: string; address: string }[];
  chain?: string;
  execute: boolean;
}) {
  const chainSelected = Boolean(chain && chain !== ALL_CHAINS);
  const implementation = chainSelected ? implementations.find((item) => item.chainId === chain) : undefined;
  const unavailable = chainSelected && !implementation;
  const breakdownKey = implementation ? `${implementation.chainId}:${implementation.address}` : fungibleId;
  const filter = implementation
    ? `filter[fungible_implementations]=${encodeURIComponent(breakdownKey)}`
    : `filter[fungible_ids]=${encodeURIComponent(fungibleId)}`;
  const path = `wallets/${address}/pnl?currency=usd&${filter}`;
  const shouldFetch = execute && !unavailable;
  const { data, isLoading, error } = usePromise(fetchTokenPnl, [path, breakdownKey], {
    execute: shouldFetch,
    onError: (error: Error) => {
      console.error(error);
    },
  });
  return { pnl: unavailable ? undefined : data, isLoading: shouldFetch && isLoading, error, unavailable };
}
