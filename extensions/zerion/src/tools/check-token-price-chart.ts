import { withAccessToken } from "@raycast/utils";
import { apiFetch, type ApiChartAttributes, type ApiChartPeriod } from "../shared/api";
import { zerionOAuth } from "../shared/oauth";

interface Input {
  /**
   * Fungible asset id from the Zerion API
   * (returned by the search-blockchain tool, e.g. "eth" or a token id)
   * required parameter
   */
  tokenId: string;
  /**
   * Time period until now for the price chart
   * optional parameter, defaults to "year"
   */
  period?: ApiChartPeriod;
}

interface Output {
  period: ApiChartPeriod;
  begin_at: string;
  end_at: string;
  stats: ApiChartAttributes["stats"];
  // [timestamp, price] pairs; declared as number[][] because tool schema extraction does not support tuple types
  points: number[][];
}

/**
 * Returns historical price data of a token: chart stats (first, min, avg, max,
 * last) and points as [timestamp, price] tuples. Prices are in USD.
 */
async function tool(input: Input): Promise<Output> {
  const period: ApiChartPeriod = input.period ?? "year";
  const result = await apiFetch<{ data: { attributes: ApiChartAttributes } }>(
    `fungibles/${encodeURIComponent(input.tokenId)}/charts/${period}?currency=usd`,
  );
  const { begin_at, end_at, stats, points } = result.data.attributes;

  return { period, begin_at, end_at, stats, points };
}

export default withAccessToken(zerionOAuth)(tool);
