declare const brand: unique symbol;
type Brand<T, TBrand> = T & { [brand]: TBrand };

export type NormalizedAddress = Brand<string, "NormalizedAddress">;

export function normalizeAddress(address: string) {
  return address.toLowerCase() as NormalizedAddress;
}
