import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  clearAuth,
  getRememberedUserId,
  isTokenExpired,
  loadStoredAuth,
  storeAuth,
} from "../lib/auth";
import { COPY } from "../lib/constants";

interface UseAuthReturn {
  accessToken: string | null;
  tokenTimestamp: string | null;
  userId: string | null;
  rememberedUserId: string | null;
  isExpired: boolean;
  isLoggedIn: boolean;
  isLoading: boolean;
  onLoginSuccess: (enctoken: string, userId: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenTimestamp, setTokenTimestamp] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [rememberedUserId, setRememberedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const expired = tokenTimestamp ? isTokenExpired(tokenTimestamp) : false;
  const isLoggedIn = !!accessToken && !expired;

  // Load stored auth and remembered user ID on mount
  useEffect(() => {
    (async () => {
      const [stored, remembered] = await Promise.all([
        loadStoredAuth(),
        getRememberedUserId(),
      ]);
      setAccessToken(stored.accessToken);
      setTokenTimestamp(stored.tokenTimestamp);
      setUserId(stored.userId);
      setRememberedUserId(remembered ?? null);
      setIsLoading(false);
    })();
  }, []);

  const onLoginSuccess = useCallback(
    async (enctoken: string, newUserId: string) => {
      await storeAuth(enctoken, newUserId);
      setAccessToken(enctoken);
      setTokenTimestamp(new Date().toISOString());
      setUserId(newUserId);
      await showToast({
        style: Toast.Style.Success,
        title: COPY.TOAST_LOGIN_SUCCESS_TITLE,
        message: COPY.TOAST_LOGIN_SUCCESS_MESSAGE,
      });
    },
    [],
  );

  const logout = useCallback(async () => {
    await clearAuth();
    setAccessToken(null);
    setTokenTimestamp(null);
    setUserId(null);
  }, []);

  return {
    accessToken,
    tokenTimestamp,
    userId,
    rememberedUserId,
    isExpired: expired,
    isLoggedIn,
    isLoading,
    onLoginSuccess,
    logout,
  };
}
