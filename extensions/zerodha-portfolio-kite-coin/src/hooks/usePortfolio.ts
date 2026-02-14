import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  fetchHoldings,
  fetchMargins,
  fetchOrders,
  fetchPositions,
} from "../lib/api";
import { readCache, writeCache } from "../lib/cache";
import { COPY, STORAGE_KEYS } from "../lib/constants";
import { Holding, MarginsResponse, Order, Position } from "../lib/types";

interface PortfolioData {
  holdings: Holding[];
  positions: Position[];
  orders: Order[];
  margins: MarginsResponse | null;
  lastUpdated: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function usePortfolio(
  accessToken: string | null,
  isLoggedIn: boolean,
): PortfolioData {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [margins, setMargins] = useState<MarginsResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCached = useCallback(async () => {
    const [cachedHoldings, cachedPositions, cachedOrders, cachedMargins] =
      await Promise.all([
        readCache<Holding[]>(STORAGE_KEYS.HOLDINGS),
        readCache<Position[]>(STORAGE_KEYS.POSITIONS),
        readCache<Order[]>(STORAGE_KEYS.ORDERS),
        readCache<MarginsResponse>(STORAGE_KEYS.MARGINS),
      ]);

    if (cachedHoldings) setHoldings(cachedHoldings.data);
    else setHoldings([]);

    if (cachedPositions) setPositions(cachedPositions.data);
    else setPositions([]);

    if (cachedOrders) setOrders(cachedOrders.data);
    else setOrders([]);

    if (cachedMargins) setMargins(cachedMargins.data);
    else setMargins(null);

    // Use the most recent cache timestamp
    const timestamps = [
      cachedHoldings,
      cachedPositions,
      cachedOrders,
      cachedMargins,
    ]
      .filter(Boolean)
      .map((c) => c!.timestamp);
    if (timestamps.length > 0) {
      setLastUpdated(timestamps.sort().pop()!);
    } else {
      setLastUpdated(null);
    }
  }, []);

  const fetchAll = useCallback(
    async (token: string) => {
      try {
        const [h, p, o, m] = await Promise.all([
          fetchHoldings(token),
          fetchPositions(token),
          fetchOrders(token),
          fetchMargins(token),
        ]);

        setHoldings(h);
        setPositions(p.net);
        setOrders(o);
        setMargins(m);

        const now = new Date().toISOString();
        setLastUpdated(now);

        // Write to cache
        await Promise.all([
          writeCache(STORAGE_KEYS.HOLDINGS, h),
          writeCache(STORAGE_KEYS.POSITIONS, p.net),
          writeCache(STORAGE_KEYS.ORDERS, o),
          writeCache(STORAGE_KEYS.MARGINS, m),
        ]);
      } catch (err) {
        await handleApiError(err);
        // Fall back to cache
        await loadCached();
      }
    },
    [loadCached],
  );

  // Initial load
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      if (isLoggedIn && accessToken) {
        await fetchAll(accessToken);
      } else if (!isLoggedIn && !accessToken) {
        // Logged out / First run: Ensure state is empty (loadCached will clear it if LS is empty)
        await loadCached();
      } else {
        // Expired but token exists: load cache
        await loadCached();
      }
      setIsLoading(false);
    })();
  }, [accessToken, isLoggedIn, fetchAll, loadCached]);

  const refresh = useCallback(async () => {
    if (!isLoggedIn || !accessToken) return;
    setIsLoading(true);
    await fetchAll(accessToken);
    setIsLoading(false);
    await showToast({
      style: Toast.Style.Success,
      title: COPY.TOAST_REFRESH_TITLE,
      message: COPY.TOAST_REFRESH_MESSAGE,
    });
  }, [accessToken, isLoggedIn, fetchAll]);

  return {
    holdings,
    positions,
    orders,
    margins,
    lastUpdated,
    isLoading,
    refresh,
  };
}

async function handleApiError(err: unknown) {
  const error = err as Error & { status?: number };
  const status = error.status;

  if (status === 401 || status === 403) {
    await showToast({
      style: Toast.Style.Failure,
      title: COPY.TOAST_SESSION_ENDED_TITLE,
      message: COPY.TOAST_SESSION_ENDED_MESSAGE,
    });
  } else if (status === 429) {
    await showToast({
      style: Toast.Style.Failure,
      title: COPY.TOAST_RATE_LIMITED,
    });
  } else if (status && status >= 500) {
    await showToast({
      style: Toast.Style.Failure,
      title: COPY.TOAST_SERVER_ERROR,
    });
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: COPY.TOAST_NETWORK_ERROR,
    });
  }
}
