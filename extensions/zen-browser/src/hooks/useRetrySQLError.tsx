import { useEffect, useRef, useState } from "react";

const MAX_RETRIES = 5;

type UseRetrySQLErrorProps = {
  error: Error | undefined;
  onRetry: () => void;
};

export const useRetrySQLError = ({ error, onRetry }: UseRetrySQLErrorProps) => {
  const [retryCount, setRetryCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isRetryable =
      error?.message?.includes("database is locked") || error?.message?.includes("disk image is malformed");

    if (!isRetryable) {
      retryCount !== 0 && setRetryCount(0);
      return;
    }
    if (retryCount >= MAX_RETRIES) return;

    console.warn(`Retrying SQL Query... Attempt ${retryCount + 1}/${MAX_RETRIES}`);

    timerRef.current = setTimeout(() => {
      setRetryCount((c) => c + 1);
      onRetry();
    }, 500);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [error, retryCount]);
};
