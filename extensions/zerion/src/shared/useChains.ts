import { useCachedPromise } from "@raycast/utils";
import { apiFetch, getApiKey, type ApiChain } from "./api";
import type { ChainInfo } from "./types";

async function fetchChains(): Promise<Record<string, ChainInfo>> {
  const result = await apiFetch<{ data: ApiChain[] }>("chains/");
  return Object.fromEntries(
    result.data.map((chain) => [
      chain.id,
      {
        id: chain.id,
        name: chain.attributes.name,
        iconUrl: chain.attributes.icon?.url ?? null,
        txUrlFormat: chain.attributes.explorer?.tx_url_format ?? null,
      },
    ]),
  );
}

export function useChains() {
  const { data, isLoading, error } = useCachedPromise(fetchChains, [], {
    execute: Boolean(getApiKey()),
    keepPreviousData: true,
  });

  return { chainsById: data ?? {}, isLoading, error };
}

export function getChainInfo(chainsById: Record<string, ChainInfo>, chainId: string): ChainInfo {
  return chainsById[chainId] ?? { id: chainId, name: chainId, iconUrl: null, txUrlFormat: null };
}
