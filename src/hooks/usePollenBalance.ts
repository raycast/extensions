import { useEffect, useState } from "react";
import { fetchPollenBalance } from "../api/pollinations";
import { useAuth } from "./useAuth";

export function usePollenBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const { keyTier } = useAuth();

  useEffect(() => {
    if (keyTier !== "premium") return;
    fetchPollenBalance().then(setBalance);
  }, [keyTier]);

  return balance;
}
