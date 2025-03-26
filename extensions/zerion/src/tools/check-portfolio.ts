import { getZpiHeaders, ZPI_URL } from "../shared/api";
import { normalizeAddress } from "../shared/NormalizedAddress";
import { Position } from "../shared/types";

type Input = {
  /**
   * Ethereum address or ENS domain to look up
   */
  addressOrDomain: string;
};

export default async function (input: Input) {
  const response = await fetch(`${ZPI_URL}wallet/get-meta/v1?identifiers=${[input.addressOrDomain]}`, {
    headers: getZpiHeaders(),
  });
  const result = await response.json();
  const address = normalizeAddress(result.data[0]?.address);

  const portfolioResponse = await fetch(`${ZPI_URL}wallet/get-portfolio/v1`, {
    method: "POST",
    headers: getZpiHeaders({ "Zerion-Wallet-Provider": "Watch Address" }),
    body: JSON.stringify({
      addresses: [address],
      currency: "usd",
      nftPriceType: "not_included",
    }),
  });
  const portfolio = await portfolioResponse.json();

  const positionsResponse = await fetch(`${ZPI_URL}wallet/get-positions/v1`, {
    method: "POST",
    headers: getZpiHeaders({ "Zerion-Wallet-Provider": "Watch Address" }),
    body: JSON.stringify({
      addresses: [address],
      currency: "usd",
    }),
  });
  const positions = await positionsResponse.json();
  const cleanedPositions = positions.data.map((position: Position) => {
    return {
      value: position.value,
      chain: position.chain,
      name: position.asset.name,
      symbol: position.asset.symbol,
      id: position.asset.id,
    };
  });
  return {
    portfolio: portfolio.data,
    positions: cleanedPositions,
  };
}
