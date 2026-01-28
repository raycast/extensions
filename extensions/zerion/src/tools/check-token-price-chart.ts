import { getZpiHeaders, ZPI_URL } from "../shared/api";
import { handleError } from "../shared/utils";

interface Input {
  /**
   * Ethereum address of the token
   * required parameter
   * example: 0x6b175474e89094c44da98b954eedeac495271d0f
   */
  tokenId: string;
  /**
   * Time period until now that we want to check the price points
   * optional parameter
   * check the last year price by default
   */
  period?: "1h" | "1d" | "1w" | "1m" | "1y" | "max";
}

/**
 * this tool returns the historical price of a token as an array of pair [timestamp, price]
 */
export default async function (input: Input): Promise<[string, number][]> {
  try {
    const response = await fetch(`${ZPI_URL}asset/get-fungible-chart/v1`, {
      method: "POST",
      headers: getZpiHeaders(),
      body: JSON.stringify({
        fungibleId: input.tokenId,
        currency: "usd",
        addresses: [],
        period: input.period,
      }),
    });
    const chartPointsRaw = await response.json();
    return chartPointsRaw.data.points.map((item: { timestamp: string; value: number; extra: null }) => [
      item.timestamp,
      item.value,
    ]);
  } catch (error) {
    handleError({ title: "Failed to fetch token price chart", error });
    return [];
  }
}
