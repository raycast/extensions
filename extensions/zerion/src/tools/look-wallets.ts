import { resolveIdentity } from "../shared/useWalletIdentity";
import { getAddresses } from "../shared/utils";

/**
 * This tool can return info for the first 10 wallets from the user's address book
 */
export default async function (): Promise<{ address: string; ens: string | null }[]> {
  const addresses = await getAddresses();
  return Promise.all(
    addresses.slice(0, 10).map(async (address) => {
      const identity = await resolveIdentity(address);
      return { address, ens: identity?.ens ?? null };
    }),
  );
}
