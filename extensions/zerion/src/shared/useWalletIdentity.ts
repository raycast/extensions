import { useCachedPromise } from "@raycast/utils";
import { normalizeAddress, type NormalizedAddress } from "./NormalizedAddress";

const ENSDATA_URL = "https://api.ensdata.net/";

export interface WalletIdentity {
  address: NormalizedAddress;
  ens: string | null;
  avatarUrl: string | null;
}

interface EnsDataResponse {
  address?: string;
  ens?: string;
  avatar?: string;
  avatar_small?: string;
  avatar_url?: string;
  error?: boolean;
}

export function isEvmAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function isSolanaAddress(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

export function isSupportedAddress(value: string) {
  return isEvmAddress(value) || isSolanaAddress(value);
}

export function looksLikeDomain(value: string) {
  // Dotted labels ending in an alphabetic TLD, so "1.5" or "0x1.2" never trigger a resolver call
  return !value.startsWith("0x") && /^[^\s.]+(\.[^\s.]+)*\.[a-z]{2,}$/i.test(value);
}

/**
 * Resolves an address or an ENS domain to a wallet identity via the public
 * ensdata.net resolver (forward name→address, reverse address→name, avatar).
 * Returns null when the input can't be resolved to a valid address.
 */
export async function resolveIdentity(addressOrDomain?: string): Promise<WalletIdentity | null> {
  const input = addressOrDomain?.trim();
  if (!input) {
    return null;
  }
  const fallback: WalletIdentity | null = isSupportedAddress(input)
    ? { address: normalizeAddress(input), ens: null, avatarUrl: null }
    : null;
  if (!fallback && !looksLikeDomain(input)) {
    return null;
  }
  if (fallback && !isEvmAddress(input)) {
    // ensdata resolves ENS/EVM only; Solana addresses pass through as-is
    return fallback;
  }
  try {
    const response = await fetch(`${ENSDATA_URL}${encodeURIComponent(input)}`);
    if (!response.ok) {
      return fallback;
    }
    const data = (await response.json()) as EnsDataResponse;
    if (!data.address || !isEvmAddress(data.address)) {
      return fallback;
    }
    return {
      address: normalizeAddress(data.address),
      ens: data.ens ?? null,
      avatarUrl: data.avatar_small || data.avatar_url || data.avatar || null,
    };
  } catch {
    return fallback;
  }
}

export function useWalletIdentity(addressOrDomain?: string) {
  const { data, isLoading } = useCachedPromise(resolveIdentity, [addressOrDomain], {
    execute: Boolean(addressOrDomain?.trim()),
  });

  return {
    identity: data ?? undefined,
    address: data?.address,
    isLoading: Boolean(addressOrDomain?.trim()) && isLoading,
  };
}

export function useWalletIdentities(addresses?: string[]) {
  const { data, isLoading } = useCachedPromise(
    async (list: string[]) => Promise.all(list.map((item) => resolveIdentity(item))),
    [addresses ?? []],
    { execute: Boolean(addresses?.length) },
  );

  return { identities: data, isLoading };
}
