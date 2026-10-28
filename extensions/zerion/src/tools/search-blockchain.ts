import { withAccessToken } from "@raycast/utils";
import { apiFetch, type ApiFungible } from "../shared/api";
import { zerionOAuth } from "../shared/oauth";

interface Input {
  /**
   * Token name, symbol or contract address to search for
   * required parameter
   */
  query: string;
}

/**
 * Searches fungible assets by name, symbol or address and returns the best
 * matches sorted by market cap. It is usually better to use the first item
 * from the list. Prices are in USD.
 */
async function tool(input: Input) {
  const result = await apiFetch<{ data: ApiFungible[] }>(
    `fungibles/?currency=usd&filter[search_query]=${encodeURIComponent(input.query.trim())}&sort=-market_data.market_cap&page[size]=6`,
  );

  return result.data.map((fungible) => ({
    id: fungible.id,
    name: fungible.attributes.name,
    symbol: fungible.attributes.symbol,
    price: fungible.attributes.market_data?.price ?? null,
    market_cap: fungible.attributes.market_data?.market_cap ?? null,
    changes: {
      percent_1d: fungible.attributes.market_data?.changes?.percent_1d ?? null,
    },
  }));
}

export default withAccessToken(zerionOAuth)(tool);
