import { withAccessToken } from "@raycast/utils";
import { apiFetch, type ApiPortfolioAttributes, type ApiPositionsResponse } from "../shared/api";
import { resolveIdentity } from "../shared/useWalletIdentity";
import { collectAllPositions, getPositionsFilter } from "../shared/useWalletPositions";
import { zerionOAuth } from "../shared/oauth";

type Input = {
  /**
   * Wallet address (EVM or Solana) or ENS domain to look up
   */
  addressOrDomain: string;
};

/**
 * Returns the portfolio overview and all fungible positions of a wallet.
 * Values are in USD.
 */
async function tool(input: Input) {
  const identity = await resolveIdentity(input.addressOrDomain);
  if (!identity) {
    throw new Error(`Could not resolve "${input.addressOrDomain}" to a valid wallet address.`);
  }
  const address = identity.address;

  const [portfolio, positions] = await Promise.all([
    apiFetch<{ data: { attributes: ApiPortfolioAttributes } }>(
      `wallets/${address}/portfolio?currency=usd&filter[positions]=no_filter`,
    ),
    apiFetch<ApiPositionsResponse>(
      `wallets/${address}/positions/?currency=usd${getPositionsFilter(address)}&sort=-value`,
    ).then((firstPage) => collectAllPositions(firstPage)),
  ]);

  return {
    address,
    ens: identity.ens,
    portfolio: portfolio.data.attributes,
    positions: positions.map((position) => ({
      name: position.attributes.fungible_info.name,
      symbol: position.attributes.fungible_info.symbol,
      fungible_id: position.relationships.fungible.data.id,
      chain: position.relationships.chain.data.id,
      position_type: position.attributes.position_type,
      quantity: position.attributes.quantity.float,
      value: position.attributes.value,
    })),
  };
}

export default withAccessToken(zerionOAuth)(tool);
