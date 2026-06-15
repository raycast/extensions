import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { fetchMFHoldings, fetchMFOrders, fetchSIPs } from "../lib/api";
import { readCache, writeCache } from "../lib/cache";
import { COPY, STORAGE_KEYS } from "../lib/constants";
import { MFHolding, MFOrder, SIP } from "../lib/types";

interface MutualFundsData {
  mfHoldings: MFHolding[];
  sips: SIP[];
  mfOrders: MFOrder[];
  lastUpdated: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useMutualFunds(
  accessToken: string | null,
  isLoggedIn: boolean,
): MutualFundsData {
  const [mfHoldings, setMfHoldings] = useState<MFHolding[]>([]);
  const [sips, setSips] = useState<SIP[]>([]);
  const [mfOrders, setMfOrders] = useState<MFOrder[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCached = useCallback(async () => {
    const [cachedMF, cachedSIPs, cachedOrders] = await Promise.all([
      readCache<MFHolding[]>(STORAGE_KEYS.MF_HOLDINGS),
      readCache<SIP[]>(STORAGE_KEYS.MF_SIPS),
      readCache<MFOrder[]>(STORAGE_KEYS.MF_ORDERS),
    ]);

    if (cachedMF) setMfHoldings(cachedMF.data);
    else setMfHoldings([]);

    if (cachedSIPs) setSips(cachedSIPs.data);
    else setSips([]);

    if (cachedOrders) setMfOrders(cachedOrders.data);
    else setMfOrders([]);

    const timestamps = [cachedMF, cachedSIPs, cachedOrders]
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
        const [h, s, o] = await Promise.all([
          fetchMFHoldings(token),
          fetchSIPs(token),
          fetchMFOrders(token),
        ]);

        setMfHoldings(h);
        setSips(s);
        setMfOrders(o);

        const now = new Date().toISOString();
        setLastUpdated(now);

        await Promise.all([
          writeCache(STORAGE_KEYS.MF_HOLDINGS, h),
          writeCache(STORAGE_KEYS.MF_SIPS, s),
          writeCache(STORAGE_KEYS.MF_ORDERS, o),
        ]);
      } catch (err) {
        await handleApiError(err);
        await loadCached();
      }
    },
    [loadCached],
  );

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      if (isLoggedIn && accessToken) {
        await fetchAll(accessToken);
      } else if (!isLoggedIn && !accessToken) {
        await loadCached();
      } else {
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

  return { mfHoldings, sips, mfOrders, lastUpdated, isLoading, refresh };
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
