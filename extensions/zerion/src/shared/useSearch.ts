import { useMemo } from "react";
import { useFetch } from "@raycast/utils";
import { getZpiHeaders, ZPI_URL } from "./api";
import type { SearchResult } from "./types";

export function useSearch(query?: string) {
  const { data, isLoading } = useFetch<{ data: SearchResult }>(
    `${ZPI_URL}search/query/v1?query=${query?.trim()}&currency=usd&limit=6`,
    useMemo(
      () => ({
        headers: getZpiHeaders(),
        execute: Boolean(query),
      }),
      [query],
    ),
  );

  return {
    tokens: data?.data.fungibles,
    wallets: data?.data.wallets,
    dapps: data?.data.dapps,
    isLoading,
  };
}
