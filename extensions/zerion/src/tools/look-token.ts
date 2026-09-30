import { withAccessToken } from "@raycast/utils";
import { apiFetch, type ApiFungible } from "../shared/api";
import { zerionOAuth } from "../shared/oauth";

interface Input {
  /**
   * Fungible asset id from the Zerion API
   * (returned by the search-blockchain tool, e.g. "eth" or a token id)
   * required parameter
   */
  tokenId: string;
}

/**
 * Fetches full info of a fungible asset: name, symbol, description, price,
 * market data, and its implementations (addresses and decimals) across chains.
 * Prices and market caps are in USD.
 */
async function tool(input: Input) {
  const result = await apiFetch<{ data: ApiFungible }>(`fungibles/${encodeURIComponent(input.tokenId)}?currency=usd`);
  const { attributes } = result.data;

  return {
    id: result.data.id,
    name: attributes.name,
    symbol: attributes.symbol,
    description: attributes.description,
    verified: attributes.flags.verified,
    icon_url: attributes.icon?.url ?? null,
    market_data: attributes.market_data,
    implementations: attributes.implementations,
    external_links: attributes.external_links ?? [],
  };
}

export default withAccessToken(zerionOAuth)(tool);
