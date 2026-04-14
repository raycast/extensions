import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { TOKEN_STORAGE_KEY } from "../connect";
import type { KeyTier } from "../api/pollinations";

export function detectKeyTier(key: string | null): KeyTier {
  if (!key) return "none";
  return key.startsWith("sk_") ? "premium" : "free";
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    LocalStorage.getItem<string>(TOKEN_STORAGE_KEY).then((val) => {
      setToken(val ?? null);
      setIsLoading(false);
    });
  }, []);

  return {
    token,
    isLoading,
    hasKey: !!token,
    keyTier: detectKeyTier(token),
  };
}
