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

/**
 * Returns historical price data of a token: chart stats (first, min, avg, max,
 * last) and points as [timestamp, price] tuples. Prices are in USD.
 */
async function tool(input: Input) {
  const period: ApiChartPeriod = input.period ?? "year";
  const result = await apiFetch<{ data: { attributes: ApiChartAttributes } }>(
    `fungibles/${encodeURIComponent(input.tokenId)}/charts/${period}?currency=usd`,
  );
  const { begin_at, end_at, stats, points } = result.data.attributes;

  return { period, begin_at, end_at, stats, points };
}

export default withAccessToken(zerionOAuth)(tool);
