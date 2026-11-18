import { KITE_API_BASE } from "./constants";
import {
  Holding,
  MarginsResponse,
  MFHolding,
  MFOrder,
  Order,
  PositionsResponse,
  SIP,
} from "./types";

/**
 * Make an authenticated request to the Kite API.
 */
async function kiteRequest<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${KITE_API_BASE}${path}`, {
    headers: {
      Authorization: `enctoken ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = new Error(`Kite API error: ${response.status}`) as Error & {
      status: number;
    };
    error.status = response.status;
    throw error;
  }

  const json = (await response.json()) as { data: T };
  return json.data;
}

// ---- Stocks ----

export async function fetchHoldings(accessToken: string): Promise<Holding[]> {
  return kiteRequest<Holding[]>("/portfolio/holdings", accessToken);
}

export async function fetchPositions(
  accessToken: string,
): Promise<PositionsResponse> {
  return kiteRequest<PositionsResponse>("/portfolio/positions", accessToken);
}

export async function fetchOrders(accessToken: string): Promise<Order[]> {
  return kiteRequest<Order[]>("/orders", accessToken);
}

export async function fetchMargins(
  accessToken: string,
): Promise<MarginsResponse> {
  return kiteRequest<MarginsResponse>("/user/margins", accessToken);
}

// ---- Mutual Funds ----

export async function fetchMFHoldings(
  accessToken: string,
): Promise<MFHolding[]> {
  return kiteRequest<MFHolding[]>("/mf/holdings", accessToken);
}

export async function fetchSIPs(accessToken: string): Promise<SIP[]> {
  return kiteRequest<SIP[]>("/mf/sips", accessToken);
}

export async function fetchMFOrders(accessToken: string): Promise<MFOrder[]> {
  return kiteRequest<MFOrder[]>("/mf/orders", accessToken);
}
