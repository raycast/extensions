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

import { useState, useEffect, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import { readZshrcFile } from "../lib/zsh";
import { LogicalSection, toLogicalSections } from "../lib/parse-zshrc";
import { isZshManagerError } from "../utils/errors";

interface UseZshrcLoaderResult {
  /** Parsed logical sections from zshrc file */
  sections: LogicalSection[];
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
 *
 * @example
 * const { sections, isLoading, refresh } = useZshrcLoader("Aliases");
 * return (
 *   <List isLoading={isLoading}>
 *     {sections.map(section => <List.Item key={section.label} />)}
 *   </List>
 * );
 */
export function useZshrcLoader(commandName: string): UseZshrcLoaderResult {
  const [sections, setSections] = useState<LogicalSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  const loadSections = useCallback(async () => {
    try {
      setLastError(null);
      const content = await readZshrcFile();
      const parsedSections = toLogicalSections(content);
      setSections([...parsedSections]);
      setIsFromCache(false);
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error("Failed to load zshrc file");
      setLastError(errorObj);

      const message = isZshManagerError(error)
        ? error.userMessage
        : error instanceof Error
          ? error.message
          : "Failed to load zshrc file";

      // Show error toast but don't clear existing sections (graceful fallback)
      await showToast({
        style: Toast.Style.Failure,
        title: `Error Loading ${commandName}`,
        message: `Using cached data: ${message}`,
      });

      // Keep existing sections as fallback
      setIsFromCache(true);
    } finally {
      setIsLoading(false);
    }
  }, [commandName]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    loadSections();
  }, [loadSections]);

  return { sections, isLoading, refresh, isFromCache, lastError };
}
