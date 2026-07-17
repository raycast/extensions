import { useEffect, useRef, useState } from "react";

/**
 * Custom hook for managing delayed error display
 * This centralizes the pattern used across multiple components where errors
 * are shown after a delay to give APIs time to catch up
 */
export function useDelayedError(delay: number = 150) {
  const [showError, setShowError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setErrorWithDelay = (errorMessage: string | null) => {
    // Clear any existing timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }

    // Set the error immediately
    setError(errorMessage);

    if (errorMessage) {
      // Delay showing the error by the specified delay
      errorTimeoutRef.current = setTimeout(() => {
        setShowError(true);
      }, delay);
    } else {
      // Clear error display immediately if no error
      setShowError(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  return {
    error,
    showError,
    setErrorWithDelay,
    clearError: () => setErrorWithDelay(null),
  };
}
