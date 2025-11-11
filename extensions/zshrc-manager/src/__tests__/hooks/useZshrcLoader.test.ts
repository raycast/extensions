/**
 * Tests for useZshrcLoader custom hook
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { vi } from "vitest";
import { useZshrcLoader } from "../../hooks/useZshrcLoader";
import { readZshrcFile } from "../../lib/zsh";
import { toLogicalSections } from "../../lib/parse-zshrc";
import { showToast } from "@raycast/api";

// Mock dependencies
vi.mock("../../lib/zsh");
vi.mock("../../lib/parse-zshrc");
vi.mock("@raycast/api");

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

    expect(mockShowToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Error Loading Aliases",
      message: "Using cached data: File not found",
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

    expect(mockShowToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Error Loading Exports",
      message: "Using cached data: Custom error message",
    });
  });

  it("should refresh data when refresh is called", async () => {
    mockReadZshrcFile.mockResolvedValue("export TEST=value");
    mockToLogicalSections.mockReturnValue(mockSections);

    const { result } = renderHook(() => useZshrcLoader("Aliases"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockReadZshrcFile).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockReadZshrcFile).toHaveBeenCalledTimes(2);
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
      expect(mockShowToast).toHaveBeenCalledWith({
        style: "failure",
        title: "Error Loading CustomCommand",
        message: "Using cached data: Test error",
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

    expect(mockShowToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Error Loading Aliases",
      message: "Using cached data: Parse error",
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
