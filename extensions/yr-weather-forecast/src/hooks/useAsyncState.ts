/**
 * Centralized async state management hook
 * This consolidates the common pattern of managing loading states, data, and errors
 * for async operations across multiple components
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UseAsyncStateOptions<T> {
  /**
   * Initial data value
   */
  initialData?: T | null;

  /**
   * Whether to start in loading state
   */
  initialLoading?: boolean;

  /**
   * Whether to automatically clear error when starting new operation
   */
  clearErrorOnStart?: boolean;

  /**
   * Whether to preserve previous data while loading new data
   */
  preserveData?: boolean;

  /**
   * Custom error message formatter
   */
  formatError?: (error: unknown) => string;
}

/**
 * Hook for managing async operations with loading states, data, and error handling
 * Consolidates the common pattern used across multiple components
 */
export function useAsyncState<T>(options: UseAsyncStateOptions<T> = {}): [
  AsyncState<T>,
  {
    execute: (asyncFn: () => Promise<T>) => Promise<T | null>;
    setData: (data: T | null) => void;
    setError: (error: string | null) => void;
    setLoading: (loading: boolean) => void;
    reset: () => void;
  },
] {
  const {
    initialData = null,
    initialLoading = false,
    clearErrorOnStart = true,
    preserveData = false,
    formatError = (error: unknown) => String(error),
  } = options;

  const [state, setState] = useState<AsyncState<T>>(() => ({
    data: initialData,
    loading: initialLoading,
    error: null,
  }));

  const cancelledRef = useRef(false);
  const currentOperationRef = useRef<Promise<T | null> | null>(null);

  // Use refs to store the latest state setters to avoid dependency issues
  const setDataRef = useRef<(data: T | null) => void | undefined>(undefined);
  const setErrorRef = useRef<(error: string | null) => void | undefined>(undefined);
  const setLoadingRef = useRef<(loading: boolean) => void | undefined>(undefined);

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data, error: null }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  // Update refs when setters change
  useEffect(() => {
    setDataRef.current = setData;
    setErrorRef.current = setError;
    setLoadingRef.current = setLoading;
  });

  const reset = useCallback(() => {
    setState({
      data: initialData,
      loading: initialLoading,
      error: null,
    });
  }, [initialData, initialLoading]);

  const execute = useCallback(
    async (asyncFn: () => Promise<T>): Promise<T | null> => {
      // Cancel previous operation
      cancelledRef.current = true;

      // Wait for previous operation to complete if it exists
      if (currentOperationRef.current) {
        try {
          await currentOperationRef.current;
        } catch {
          // Ignore errors from cancelled operations
        }
      }

      // Start new operation
      cancelledRef.current = false;

      if (clearErrorOnStart) {
        setErrorRef.current?.(null);
      }

      if (!preserveData) {
        setDataRef.current?.(null);
      }

      setLoadingRef.current?.(true);

      const operation = asyncFn()
        .then((result) => {
          if (!cancelledRef.current) {
            setDataRef.current?.(result);
            setLoadingRef.current?.(false);
            return result;
          }
          return null;
        })
        .catch((error) => {
          if (!cancelledRef.current) {
            const errorMessage = formatError(error);
            setErrorRef.current?.(errorMessage);
            setLoadingRef.current?.(false);
          }
          throw error;
        });

      currentOperationRef.current = operation;
      return operation;
    },
    [clearErrorOnStart, preserveData, formatError],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  return [
    state,
    {
      execute,
      setData,
      setError,
      setLoading,
      reset,
    },
  ];
}

/**
 * Specialized hook for data fetching operations
 * Provides a simpler interface for common fetch patterns
 */
export function useAsyncFetch<T>(
  asyncFn: () => Promise<T>,
  dependencies: React.DependencyList = [],
  options: UseAsyncStateOptions<T> = {},
) {
  const [state, { execute, setData, setError, setLoading, reset }] = useAsyncState<T>(options);

  const fetch = useCallback(() => {
    return execute(asyncFn);
  }, [execute, asyncFn]);

  // Auto-execute when dependencies change
  useEffect(() => {
    fetch();
  }, dependencies);

  return {
    ...state,
    fetch,
    setData,
    setError,
    setLoading,
    reset,
  };
}

/**
 * Hook for managing search operations with debouncing
 * Consolidates the common search pattern used across components
 */
export function useAsyncSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  options: {
    debounceMs?: number;
    minQueryLength?: number;
    clearOnEmpty?: boolean;
  } = {},
) {
  const { debounceMs = 300, minQueryLength = 0, clearOnEmpty = true } = options;

  const [state, { execute, setData, setError, setLoading, reset }] = useAsyncState<T[]>({
    initialData: [],
    clearErrorOnStart: true,
    preserveData: false,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(
    (query: string) => {
      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Clear results if query is too short
      if (query.length < minQueryLength) {
        if (clearOnEmpty) {
          setData([]);
        }
        return;
      }

      // Debounce the search
      timeoutRef.current = setTimeout(() => {
        execute(() => searchFn(query));
      }, debounceMs);
    },
    [execute, searchFn, debounceMs, minQueryLength, clearOnEmpty, setData],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    search,
    setData,
    setError,
    setLoading,
    reset,
  };
}
