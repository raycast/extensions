import { useMemo } from "react";
import { useFetch } from "@raycast/utils";
import { API_URL, getApiHeaders, parseApiResponse, type ApiWalletChartAttributes } from "./api";
import type { Period } from "./periods";

export interface WalletChart {
  /** [timestamp in ms, usd value], oldest first */
  points: [number, number][];
}

async function parseWalletChart(response: Response): Promise<WalletChart> {
  const result = await parseApiResponse<{ data: { attributes: ApiWalletChartAttributes } }>(response);
  return {
    points: result.data.attributes.points.map(([timestamp, value]) => [timestamp * 1000, value]),
  };
}

export function useWalletChart({ address, period }: { address?: string; period: Period }) {
  const { data, isLoading, error } = useFetch<WalletChart>(
    `${API_URL}wallets/${address}/charts/${period.apiPeriod}?currency=usd`,
    useMemo(
      () => ({
        headers: getApiHeaders(),
        parseResponse: parseWalletChart,
        execute: Boolean(address),
        // Keep the previous Period's chart on screen while the next one loads
        keepPreviousData: true,
        onError: (error: Error) => {
          console.error(error);
        },
      }),
      [address],
    ),
  );

  return { chart: data, isLoading: Boolean(address) && isLoading, error };
}
