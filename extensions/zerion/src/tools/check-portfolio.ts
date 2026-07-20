import { getZpiHeaders, ZPI_URL } from "../shared/api";
import { normalizeAddress } from "../shared/NormalizedAddress";
import { AddressPortfolio, Position } from "../shared/types";
import { handleError } from "../shared/utils";

type Input = {
  /**
   * Ethereum address or ENS domain to look up
   */
  addressOrDomain: string;
};

export default async function (input: Input): Promise<{ portfolio?: AddressPortfolio; positions?: Position[] }> {
  let address: string | null = null;

  try {
    const response = await fetch(`${ZPI_URL}wallet/get-meta/v1?identifiers=${input.addressOrDomain}`, {
      headers: getZpiHeaders(),
    });
    const result = await response.json();
    address = normalizeAddress(result.data[0]?.address);
  } catch (error) {
    handleError({ title: "Failed to fetch wallet", error });
    return {};
  }

  let portfolio: { data: AddressPortfolio } | null = null;

  try {
    const portfolioResponse = await fetch(`${ZPI_URL}wallet/get-portfolio/v1`, {
      method: "POST",
      headers: getZpiHeaders({ "Zerion-Wallet-Provider": "Watch Address" }),
      body: JSON.stringify({
        addresses: [address],
        currency: "usd",
        nftPriceType: "not_included",
      }),
    });
    portfolio = await portfolioResponse.json();
  } catch (error) {
    handleError({ title: "Failed to fetch wallet portfolio", error });
    return {};
  }

  let cleanedPositions: Position[] = [];
  try {
    const positionsResponse = await fetch(`${ZPI_URL}wallet/get-positions/v1`, {
      method: "POST",
      headers: getZpiHeaders({ "Zerion-Wallet-Provider": "Watch Address" }),
      body: JSON.stringify({
        addresses: [address],
        currency: "usd",
      }),
    });
    const positions = await positionsResponse.json();
    cleanedPositions = positions.data.map((position: Position) => {
      return {
        value: position.value,
        chain: position.chain,
        name: position.asset.name,
        symbol: position.asset.symbol,
        id: position.asset.id,
      };
    });
  } catch (error) {
    handleError({ title: "Failed to fetch wallet positions", error });
  }
  return {
    portfolio: portfolio?.data,
    positions: cleanedPositions,
  };
}
