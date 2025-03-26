import { getZpiHeaders, ZPI_URL } from "../shared/api";

interface Input {
  /**
   * Ethereum address, ENS domain, token name, or token symbol
   * the search query from the user's request
   * required parameter
   */
  query: string;
}

export default async function (input: Input) {
  const response = await fetch(`${ZPI_URL}search/query/v1?query=${input.query.trim()}&currency=usd&limit=6`, {
    headers: getZpiHeaders(),
  });
  const result = await response.json();
  return result.data;
}
