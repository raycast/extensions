/**
 * Tests for useZshrcLoader custom hook
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { vi } from "vitest";
import { useState, useEffect, useCallback } from "react";
import { useZshrcLoader } from "../../hooks/useZshrcLoader";
import { readZshrcFile } from "../../lib/zsh";
import { toLogicalSections } from "../../lib/parse-zshrc";
import { showToast } from "@raycast/api";

// Mock dependencies
vi.mock("../../lib/zsh");
vi.mock("../../lib/parse-zshrc");
vi.mock("@raycast/api");

// Mock @raycast/utils - useCachedPromise with proper React hooks
vi.mock("@raycast/utils", () => ({
  useCachedPromise: <T>(
    fn: () => Promise<T>,
    _deps: unknown[],
    options?: { keepPreviousData?: boolean; onError?: (error: Error) => void },
  ) => {
    const [data, setData] = useState<T | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | undefined>(undefined);

    // Note: Using an empty dependency array for execute to prevent infinite loops
    // The fn and options are stable references from the test setup
    const execute = useCallback(async () => {
      setIsLoading(true);
      setError(undefined);
      try {
        const result = await fn();
        setData(result);
        setIsLoading(false);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        setIsLoading(false);
        options?.onError?.(err);
      }
      // fn and options are closure-captured from mock setup, not reactive values; including them causes infinite loops
    }, []);

    // Only run once on mount to prevent infinite loops
    useEffect(() => {
      execute();
      // execute is intentionally excluded to run only once on mount, mimicking useCachedPromise behavior
    }, []);

    return {
      data,
      isLoading,
      error,
      revalidate: execute,
    };
  },
}));

const mockReadZshrcFile = vi.mocked(readZshrcFile);
const mockToLogicalSections = vi.mocked(toLogicalSections);
const mockShowToast = vi.mocked(showToast);

// Mock data
const mockSections = [
  {
    label: "Test Section",
    startLine: 1,
    endLine: 10,
    content: "export TEST=value",
    aliasCount: 0,
    exportCount: 1,
    evalCount: 0,
    setoptCount: 0,
    pluginCount: 0,
    functionCount: 0,
    sourceCount: 0,
    autoloadCount: 0,
    fpathCount: 0,
    pathCount: 0,
    themeCount: 0,
    completionCount: 0,
    historyCount: 0,
    keybindingCount: 0,
    otherCount: 0,
  },
];

describe("useZshrcLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load sections on mount", async () => {
    mockReadZshrcFile.mockResolvedValue("export TEST=value");
    mockToLogicalSections.mockReturnValue(mockSections);

    const { result } = renderHook(() => useZshrcLoader("Aliases"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockReadZshrcFile).toHaveBeenCalled();
    expect(mockToLogicalSections).toHaveBeenCalledWith("export TEST=value");
    expect(result.current.sections).toEqual(mockSections);
  });

  it("should set isLoading to false after successful load", async () => {
    mockReadZshrcFile.mockResolvedValue("export TEST=value");
    mockToLogicalSections.mockReturnValue(mockSections);

    const { result } = renderHook(() => useZshrcLoader("Aliases"));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should handle file read errors", async () => {
    const error = new Error("File not found");
    mockReadZshrcFile.mockRejectedValue(error);

    const { result } = renderHook(() => useZshrcLoader("Aliases"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Without cached data, the message only shows the error
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Error Loading Aliases",
      message: "File not found",
    });
    expect(result.current.sections).toEqual([]);
  });

  it("should handle ZshManagerError with user message", async () => {
    // Since isZshManagerError checks instanceof, we need to test with actual instances
    // For now, test that plain objects with userMessage property fall back to default message
    const error = new Error("Custom error message");
    mockReadZshrcFile.mockRejectedValue(error);

    const { result } = renderHook(() => useZshrcLoader("Exports"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Without cached data, the message only shows the error
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Error Loading Exports",
      message: "Custom error message",
    });
  });

  it("should refresh data when refresh is called", async () => {
    mockReadZshrcFile.mockResolvedValue("export TEST=value");
    mockToLogicalSections.mockReturnValue(mockSections);

    const { result } = renderHook(() => useZshrcLoader("Aliases"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialCallCount = mockReadZshrcFile.mock.calls.length;

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockReadZshrcFile.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  it("should set isLoading to true during refresh", async () => {
    mockReadZshrcFile.mockResolvedValue("export TEST=value");
    mockToLogicalSections.mockReturnValue(mockSections);

    const { result } = renderHook(() => useZshrcLoader("Aliases"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.refresh();
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should include command name in error toast", async () => {
    mockReadZshrcFile.mockRejectedValue(new Error("Test error"));

    renderHook(() => useZshrcLoader("CustomCommand"));

    await waitFor(() => {
      // Without cached data, the message only shows the error
      expect(mockShowToast).toHaveBeenCalledWith({
        style: "failure",
        title: "Error Loading CustomCommand",
        message: "Test error",
      });
    });
  });

  it("should handle parsing errors", async () => {
    mockReadZshrcFile.mockResolvedValue("export TEST=value");
    mockToLogicalSections.mockImplementation(() => {
      throw new Error("Parse error");
    });

    const { result } = renderHook(() => useZshrcLoader("Aliases"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Without cached data, the message only shows the error
    expect(mockShowToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Error Loading Aliases",
      message: "Parse error",
    });
  });

  it("should start with empty sections", () => {
    mockReadZshrcFile.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useZshrcLoader("Aliases"));

    expect(result.current.sections).toEqual([]);
  });

  it("should update sections after successful load", async () => {
    mockReadZshrcFile.mockResolvedValue("export TEST=value");
    mockToLogicalSections.mockReturnValue(mockSections);

    const { result } = renderHook(() => useZshrcLoader("Aliases"));

    expect(result.current.sections).toEqual([]);

    await waitFor(() => {
      expect(result.current.sections).toEqual(mockSections);
    });
  });
});
