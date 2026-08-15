import { open } from "@raycast/api";
import { handleError } from "../shared/utils";

interface Input {
  /**
   * Chain ID of the network
   * example: ethereum, polygon, zero
   */
  chain?: string;
  /**
   * Token ID of the token to sell
   */
  sellTokenId?: string;
  /**
   * Token ID of the token to buy
   */
  buyTokenId?: string;
  /**
   * Amount to receive
   * example 12.2
   */
  receiveAmount?: number;
  /**
   * Amount to spend
   * example: 100
   */
  spendAmount?: number;
}

/**
 * at least one of sellTokenId or buyTokenId should be provided
 * if chain is not provided, find the best chain from implementations data of the asset using 'look-token' tool
 * if both sellTokenId and buyTokenId are provided, the tool should return the best chain to swap between the two tokens
 *
 * get token id from 'search-blockchain' to get the right id to use it for this tool
 *
 * Suggest user to open the link in a browser after generating it
 */
export default async function (input: Input) {
  try {
    if (!input.sellTokenId && !input.buyTokenId) {
      throw new Error("At least one of sellTokenId or buyTokenId must be provided");
    }

    const urlParams = new URLSearchParams({
      chainInput: input.chain || "",
      spendTokenInput: input.sellTokenId || "",
      receiveTokenInput: input.buyTokenId || "",
      receiveInput: input.receiveAmount?.toString() || "",
      spendInput: input.spendAmount?.toString() || "",
    });
    const link = `https://app.zerion.io/swap?${urlParams.toString()}`;
    await open(link);
  } catch (error) {
    await handleError({ title: "Failed to open Zerion Swap Form", error });
  }
}
