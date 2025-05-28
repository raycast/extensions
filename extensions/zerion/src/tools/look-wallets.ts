import { getZpiHeaders, ZPI_URL } from "../shared/api";
import { WalletMetadata } from "../shared/types";
import { getAddresses, handleError } from "../shared/utils";

/**
 * This tool can return info for the first 10 wallets from the user's address book
 */
export default async function (): Promise<WalletMetadata[]> {
  try {
    const addresses = await getAddresses();
    const response = await fetch(`${ZPI_URL}wallet/get-meta/v1?identifiers=${addresses?.slice(0, 10).join(",")}`, {
      headers: getZpiHeaders(),
    });
    const result = await response.json();
    return result.data;
  } catch (error) {
    handleError({ title: "Failed to fetch wallets", error });
    return [];
  }
}
