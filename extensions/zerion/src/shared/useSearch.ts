import { useMemo } from "react";
import { useCachedPromise, useFetch } from "@raycast/utils";
import { API_URL, getApiHeaders, parseApiResponse, type ApiFungible } from "./api";
import { isSupportedAddress, looksLikeDomain, resolveIdentity } from "./useWalletIdentity";
import type { SearchAsset, SearchWallet } from "./types";

export function mapFungibleToSearchAsset(fungible: ApiFungible): SearchAsset {
  const { attributes } = fungible;
  return {
    id: fungible.id,
    name: attributes.name,
    symbol: attributes.symbol,
    iconUrl: attributes.icon?.url ?? null,
    price: attributes.market_data?.price ?? null,
    relativeChange1d: attributes.market_data?.changes?.percent_1d ?? null,
    marketCap: attributes.market_data?.market_cap ?? null,
  };
}

async function parseFungibles(response: Response): Promise<SearchAsset[]> {
  const result = await parseApiResponse<{ data: ApiFungible[] }>(response);
  return result.data.map(mapFungibleToSearchAsset);
}

async function findWallet(query: string): Promise<SearchWallet | null> {
  if (!isSupportedAddress(query) && !looksLikeDomain(query)) {
    return null;
  }
  const identity = await resolveIdentity(query);
  return identity ? { address: identity.address, name: identity.ens, iconUrl: identity.avatarUrl } : null;
}

export function useSearch(query?: string) {
  const trimmedQuery = query?.trim();

  const {
    data: tokens,
    isLoading: tokensAreLoading,
    error,
  } = useFetch<SearchAsset[]>(
    `${API_URL}fungibles/?currency=usd&filter[search_query]=${encodeURIComponent(trimmedQuery ?? "")}&sort=-market_data.market_cap&page[size]=6`,
    useMemo(
      () => ({
        headers: getApiHeaders(),
        parseResponse: parseFungibles,
        execute: Boolean(trimmedQuery),
        onError: (error: Error) => {
          console.error(error);
        },
      }),
      [trimmedQuery],
    ),
  );

  const { data: wallet, isLoading: walletIsLoading } = useCachedPromise(findWallet, [trimmedQuery ?? ""], {
    execute: Boolean(trimmedQuery),
  });

  return {
    tokens,
    wallets: wallet ? [wallet] : [],
    isLoading: Boolean(trimmedQuery) && (tokensAreLoading || walletIsLoading),
    error,
  };
}
