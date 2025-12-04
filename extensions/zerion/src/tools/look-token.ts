import { getZpiHeaders, ZPI_URL } from "../shared/api";
import { handleError } from "../shared/utils";

interface Input {
  /**
   * token address on Ethereum
   * required parameter
   * example: 0x6b175474e89094c44da98b954eedeac495271d0f
   */
  tokenId: string;
}

interface Asset {
  id: string;
  iconUrl: string | null;
  name: string;
  new: boolean;
  symbol: string;
  verified: boolean;
  implementations: Record<string, { address: string | null; decimals: number }>;
  meta: {
    circulatingSupply: number | null;
    fullyDilutedValuation: number | null;
    marketCap: number | null;
    price: number | null;
    relativeChange1d: number | null;
    relativeChange30d: number | null;
    relativeChange90d: number | null;
    relativeChange365d: number | null;
    totalSupply: number | null;
  };
}

interface AssetResource {
  name: string;
  url: string;
  iconUrl: string;
  displayableName: string;
}

interface AssetFullInfo {
  extra: {
    createdAt: string;
    description: string | null;
    holders: null;
    liquidity: null;
    top10: null;
    volume24h: null;
    relevantResources: AssetResource[];
    mainChain: string;
  };
  fungible: Asset;
}

export default async function (input: Input): Promise<AssetFullInfo | null> {
  try {
    const response = await fetch(`${ZPI_URL}asset/get-fungible-full-info/v1?fungibleId=${input.tokenId}&currency=usd`, {
      headers: getZpiHeaders(),
    });
    const result = await response.json();
    return result.data;
  } catch (error) {
    handleError({ title: "Failed to fetch token info", error });
    return null;
  }
}
