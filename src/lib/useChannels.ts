import { Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useRef } from "react";
import { fetchAllChannels, tokenFingerprint, type SlackChannel } from "./channels";

const REVALIDATE_THROTTLE_MS = 5_000;

export function useChannels(token: string): {
  channels: SlackChannel[];
  isLoading: boolean;
  error?: Error;
  revalidate: () => void;
} {
  const fp = tokenFingerprint(token);
  const { data, isLoading, error, revalidate } = useCachedPromise(
    // The fingerprint is used as the cache key only; the real token is captured via closure
    // so it never lands in the on-disk cache.
    async (fingerprint: string) => {
      void fingerprint;
      const cache = await fetchAllChannels(token);
      return cache.channels;
    },
    [fp],
    { initialData: [] as SlackChannel[], keepPreviousData: true },
  );

  const lastRevalidateRef = useRef(0);
  const throttledRevalidate = useCallback(() => {
    const now = Date.now();
    if (now - lastRevalidateRef.current < REVALIDATE_THROTTLE_MS) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Slack rate limit guard",
        message: "Wait a few seconds before refreshing again",
      });
      return;
    }
    lastRevalidateRef.current = now;
    revalidate();
  }, [revalidate]);

  return {
    channels: data ?? [],
    isLoading,
    error,
    revalidate: throttledRevalidate,
  };
}
