import { open } from "@raycast/api";

interface Input {
  /**
   * Chain ID of the network
   * example: ethereum, polygon, zero
   */
  chain: string;
  /**
   * Token ID of the token to send
   * example: 0x6b175474e89094c44da98b954eedeac495271d0f or c582638a-e7c3-45b9-ac7e-1e7295b822b5
   */
  sendTokenId: string;
  /**
   * Amount to send
   * example: 100
   */
  sendAmount: number;
  /**
   * Ethereum address or ens domain to receive the token
   */
  recepient: string;
}

/**
 * Generate and open a link to send some tokens to a recepient on Zerion
 * you can pass recepient as is from the request
 * in case some params are not given, leave them empty
 */
export default async function (input: Input) {
  const urlParams = new URLSearchParams({
    tokenChain: input.chain,
    addressInputValue: input.recepient,
    tokenAssetCode: input.sendTokenId,
    tokenValue: input.sendAmount.toString(),
  });
  const link = `https://app.zerion.io/send?${urlParams.toString()}`;
  return open(link);
}
