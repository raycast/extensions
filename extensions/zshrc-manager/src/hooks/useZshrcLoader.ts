/**
 * Custom hook for loading and managing zshrc sections
 *
 * Encapsulates the common pattern of:
 * - Loading zshrc file content
 * - Parsing into logical sections
 * - Managing loading state
 * - Displaying error toasts
 *
 * This hook eliminates duplicate code across list-based commands.
 */

import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { readZshrcFile } from "../lib/zsh";
import { type LogicalSection, toLogicalSections } from "../lib/parse-zshrc";
import { isZshManagerError } from "../utils/errors";

interface UseZshrcLoaderResult {
  /** Parsed logical sections from zshrc file */
  sections: readonly LogicalSection[];
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Function to manually refresh the data */
  refresh: () => void;
  /** Whether the data is from cache (partial/fallback) */
  isFromCache: boolean;
  /** Last error encountered */
  lastError: Error | null;
}

/**
 * Hook for loading and managing zshrc sections
 *
 * @param commandName Human-readable name of the command (e.g., "Aliases", "Exports")
 * @returns Object containing sections array, loading state, and refresh function
 */
export function useZshrcLoader(commandName: string): UseZshrcLoaderResult {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async () => {
      const content = await readZshrcFile();
      return toLogicalSections(content);
    },
    [],
    {
      keepPreviousData: true,
      onError: (err: Error) => {
        const message = isZshManagerError(err)
          ? err.userMessage
          : err instanceof Error
            ? err.message
            : "Failed to load zshrc file";

        showToast({
          style: Toast.Style.Failure,
          title: `Error Loading ${commandName}`,
          message,
        });
      },
    },
  );

  return {
    sections: data ?? [],
    isLoading,
    refresh: revalidate,
    isFromCache: !!error && !!data, // Has data but also error means using cached
    lastError: error ?? null,
  };
}
