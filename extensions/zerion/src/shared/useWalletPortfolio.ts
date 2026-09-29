import { useMemo } from "react";
import { useFetch } from "@raycast/utils";
import { API_URL, getApiHeaders, parseApiResponse, type ApiPortfolioAttributes } from "./api";
import type { AddressPortfolio } from "./types";

async function parsePortfolio(response: Response): Promise<AddressPortfolio> {
  const result = await parseApiResponse<{ data: { attributes: ApiPortfolioAttributes } }>(response);
  const { total, changes, positions_distribution_by_chain } = result.data.attributes;
  return {
    totalValue: total.positions,
    change24h: { absolute: changes.absolute_1d, relative: changes.percent_1d },
    positionsChainsDistribution: positions_distribution_by_chain,
  };
}

// `apiKey` is only for callers outside a withAccessToken context (menu bar);
// wrapped commands omit it and the key resolves from getAccessToken().
export function useWalletPortfolio({ address, apiKey }: { address?: string; apiKey?: string }) {
  const {
    data: portfolio,
    isLoading,
    error,
  } = useFetch<AddressPortfolio>(
    `${API_URL}wallets/${address}/portfolio?currency=usd&filter[positions]=no_filter`,
    useMemo(
      () => ({
        headers: getApiHeaders(apiKey),
        parseResponse: parsePortfolio,
        execute: Boolean(address),
        onError: (error: Error) => {
          console.error(error);
        },
      }),
      [address, apiKey],
    ),
  );

  return { portfolio, isLoading: Boolean(address) && isLoading, error };
}
