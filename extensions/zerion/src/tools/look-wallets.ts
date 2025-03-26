import { getZpiHeaders, ZPI_URL } from "../shared/api";
import { getAddresses } from "../shared/utils";

export default async function () {
  const addresses = await getAddresses();
  const response = await fetch(`${ZPI_URL}wallet/get-meta/v1?identifiers=${addresses?.slice(0, 10).join(",")}`, {
    headers: getZpiHeaders(),
  });
  const result = await response.json();
  return result.data;
}
