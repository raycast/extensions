import { PriceData } from "./types";

export async function fetchPrices(): Promise<PriceData> {
  const res = await fetch("https://mempool.space/api/v1/prices");
  if (!res.ok) {
    throw new Error(`Failed to fetch prices (${res.status})`);
  }
  return res.json();
}
