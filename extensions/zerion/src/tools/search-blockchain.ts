import { getZpiHeaders, ZPI_URL } from "../shared/api";
import { SearchResult } from "../shared/types";
import { handleError } from "../shared/utils";

interface Input {
  /**
   * Ethereum address, ENS domain, token name, or token symbol
   * the search query from the user's request
   * required parameter
   */
  query: string;
}

export default async function (input: Input): Promise<SearchResult> {
  let result: { data: SearchResult } | null = null;
  try {
    const response = await fetch(
      `${ZPI_URL}search/query/v1?query=${encodeURIComponent(input.query.trim())}&currency=usd&limit=6`,
      {
        headers: getZpiHeaders(),
      },
    );
    result = await response.json();
    return result?.data || { dapps: [], fungibles: [], wallets: [] };
  } catch (error) {
    handleError({ title: "Failed to fetch search results", error });
    return { dapps: [], fungibles: [], wallets: [] };
  }
}
