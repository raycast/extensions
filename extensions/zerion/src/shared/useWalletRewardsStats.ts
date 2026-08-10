import { useFetch } from "@raycast/utils";
import { useMemo } from "react";

type BoostConfig = {
  asset: string;
  factor: number;
  link: { url: string; caption: string } | null;
};

export type RewardsStatistics = {
  boosts: BoostConfig[];
  xpRate: number;
  gasSpend: number;
  gasback: number;
  gasbackRate: number;
};

const DNA_API_ENDPOINT = "https://dna.zerion.io/api/";

export function useRewardsStatistics({ address }: { address?: string }) {
  const { data, isLoading } = useFetch<RewardsStatistics>(
    `${DNA_API_ENDPOINT}v1/memberships/${address}/statistics`,
    useMemo(() => ({ execute: Boolean(address) }), [address]),
  );
  return { stats: data, isLoading };
}
