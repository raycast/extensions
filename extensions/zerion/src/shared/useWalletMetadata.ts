import { useFetch } from "@raycast/utils";
import type { WalletMetadata } from "./types";
import { useMemo } from "react";
import { ZPI_URL, getZpiHeaders } from "./api";
import { normalizeAddress } from "./NormalizedAddress";

export function useWalletsMetadata(addresses?: string[]) {
  return useFetch<{ data: WalletMetadata[] }>(
    // No more then 10 addresses can be requested at once
    // Could be split by chunks of 10 and then merged
    `${ZPI_URL}wallet/get-meta/v1?identifiers=${addresses?.slice(0, 10).join(",")}`,
    useMemo(
      () => ({
        headers: getZpiHeaders(),
        execute: Boolean(addresses?.length && addresses.length <= 10),
      }),
      [addresses],
    ),
  );
}

export function useWalletMetadata(addressOrDomain?: string) {
  const addresses = useMemo(() => (addressOrDomain ? [addressOrDomain] : undefined), [addressOrDomain]);
  const { data: addressMetadata, isLoading } = useWalletsMetadata(addresses);
  const address = addressMetadata?.data[0]?.address;

  return {
    walletMetadata: addressMetadata?.data[0],
    address: address ? normalizeAddress(address) : undefined,
    isLoading,
  };
}
