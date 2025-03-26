import { getZpiHeaders, ZPI_URL } from "../shared/api";

interface Input {
  /**
   * token address on Ethereum
   * required parameter
   * example: 0x6b175474e89094c44da98b954eedeac495271d0f
   */
  tokenId: string;
}

export default async function (input: Input) {
  const response = await fetch(`${ZPI_URL}asset/get-fungible-full-info/v1?fungibleId=${input.tokenId}&currency=usd`, {
    headers: getZpiHeaders(),
  });
  const result = await response.json();
  return result.data;
}
