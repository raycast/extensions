import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { ZPI_URL, getZpiHeaders } from "./api";
import type { Position } from "./types";
import { ALL_CHAINS } from "./constants";

export function useWalletPositions({ address, chain }: { address?: string; chain?: string }) {
  const { data: addressPositions, isLoading } = useFetch<{ data: Position[] }>(
    `${ZPI_URL}wallet/get-positions/v1`,
    useMemo(
      () => ({
        method: "POST",
        headers: getZpiHeaders({ "Zerion-Wallet-Provider": "Watch Address" }),
        body: JSON.stringify({
          addresses: [address],
          currency: "usd",
          ...(chain && chain !== ALL_CHAINS ? { chainIds: [chain] } : {}),
        }),
        onError: (error) => {
          console.error(error);
        },
        execute: Boolean(address),
      }),
      [address, chain],
    ),
  );

  return {
    positions: addressPositions?.data,
    isLoading,
  };
}
