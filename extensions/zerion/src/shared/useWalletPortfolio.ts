import { useMemo } from "react";
import { useFetch } from "@raycast/utils";
import { getZpiHeaders, ZPI_URL } from "./api";
import type { AddressPortfolio } from "./types";

export function useWalletPortfolio({ address }: { address?: string }) {
  const { data: addressPortfolio, isLoading } = useFetch<{ data: AddressPortfolio }>(
    `${ZPI_URL}wallet/get-portfolio/v1`,
    useMemo(
      () => ({
        method: "POST",
        headers: getZpiHeaders({ "Zerion-Wallet-Provider": "Watch Address" }),
        body: JSON.stringify({
          addresses: [address],
          currency: "usd",
          nftPriceType: "not_included",
        }),
        onError: (error) => {
          console.error(error);
        },
        execute: Boolean(address),
      }),
      [address],
    ),
  );

  return {
    portfolio: addressPortfolio?.data,
    isLoading,
  };
}
