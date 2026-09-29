import { useMemo } from "react";
import { useFetch } from "@raycast/utils";
import {
  API_URL,
  getApiHeaders,
  getApiKey,
  parseApiResponse,
  type ApiPosition,
  type ApiPositionsResponse,
} from "./api";
import type { Position } from "./types";
import { ALL_CHAINS } from "./constants";
import { isSolanaAddress } from "./useWalletIdentity";

/**
 * The Zerion API rejects `filter[positions]=no_filter` (and `only_complex`) for
 * Solana addresses with a 400, so for them we omit the parameter and let the
 * API return its default (simple) positions.
 */
export function getPositionsFilter(address: string) {
  return isSolanaAddress(address) ? "" : "&filter[positions]=no_filter";
}

export function mapPosition(position: ApiPosition): Position {
  const { attributes, relationships } = position;
  return {
    id: position.id,
    name: attributes.name,
    type: attributes.position_type ?? "wallet",
    value: attributes.value,
    quantity: attributes.quantity.float,
    price: attributes.price,
    relativeChange24h: attributes.changes?.percent_1d ?? 0,
    chainId: relationships.chain.data.id,
    dappId: relationships.dapp?.data.id ?? null,
    asset: {
      id: relationships.fungible.data.id,
      name: attributes.fungible_info.name,
      symbol: attributes.fungible_info.symbol,
      iconUrl: attributes.fungible_info.icon?.url ?? null,
      verified: attributes.fungible_info.flags.verified,
      implementations: (attributes.fungible_info.implementations ?? []).map((implementation) => ({
        chainId: implementation.chain_id,
        address: implementation.address ?? "",
      })),
    },
  };
}

/**
 * Collects every position of a wallet, following `links.next` should the API
 * split them across pages. Today it returns even thousands of positions in a
 * single response, so this normally completes with the first page alone.
 */
export async function collectAllPositions(
  firstPage: ApiPositionsResponse,
  apiKey: string | undefined = getApiKey(),
): Promise<ApiPosition[]> {
  const positions = [...firstPage.data];
  let next = firstPage.links?.next;
  while (next) {
    const response = await fetch(next, { headers: getApiHeaders(apiKey) });
    const page = await parseApiResponse<ApiPositionsResponse>(response, apiKey);
    positions.push(...page.data);
    next = page.links?.next;
  }
  return positions;
}

async function parsePositions(response: Response): Promise<Position[]> {
  const apiKey = getApiKey();
  const firstPage = await parseApiResponse<ApiPositionsResponse>(response, apiKey);
  return (await collectAllPositions(firstPage, apiKey)).map(mapPosition);
}

export function useWalletPositions({ address, chain }: { address?: string; chain?: string }) {
  const chainFilter = chain && chain !== ALL_CHAINS ? `&filter[chain_ids]=${encodeURIComponent(chain)}` : "";
  const {
    data: positions,
    isLoading,
    error,
  } = useFetch<Position[]>(
    `${API_URL}wallets/${address}/positions/?currency=usd${getPositionsFilter(address ?? "")}&sort=-value${chainFilter}`,
    useMemo(
      () => ({
        headers: getApiHeaders(),
        parseResponse: parsePositions,
        execute: Boolean(address),
        onError: (error: Error) => {
          console.error(error);
        },
      }),
      [address, chainFilter],
    ),
  );

  return { positions, isLoading: Boolean(address) && isLoading, error };
}
