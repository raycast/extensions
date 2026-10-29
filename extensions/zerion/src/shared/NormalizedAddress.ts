declare const brand: unique symbol;
type Brand<T, TBrand> = T & { [brand]: TBrand };

export type NormalizedAddress = Brand<string, "NormalizedAddress">;

export function normalizeAddress(address: string) {
  // EVM addresses are case-insensitive; Solana addresses are case-sensitive base58
  return (address.startsWith("0x") ? address.toLowerCase() : address) as NormalizedAddress;
}
