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

  useEffect(() => {
    LocalStorage.getItem<string>(TOKEN_STORAGE_KEY).then((val) => {
      setToken(val ?? null);
    });
  }, []);

  return {
    token,
    hasKey: !!token,
    keyTier: detectKeyTier(token),
  };
}
