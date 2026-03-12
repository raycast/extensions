/** @jest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import type { LocationResult } from "../../src/location-search";
import { useSearch } from "../../src/hooks/useSearch";
import { searchLocations } from "../../src/location-search";
import { parseQueryIntent } from "../../src/query-intent";

jest.mock("../../src/location-search", () => ({
  searchLocations: jest.fn(),
}));

jest.mock("../../src/query-intent", () => ({
  parseQueryIntent: jest.fn((query: string) => ({ locationQuery: query })),
}));

function createAbortError(): Error {
  const error = new Error("aborted");
  error.name = "AbortError";
  return error;
}

describe("useSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (parseQueryIntent as jest.MockedFunction<typeof parseQueryIntent>).mockImplementation((query: string) => ({
      locationQuery: query,
    }));
  });

  it("keeps loading true while a superseding request is still pending", async () => {
    const mockedSearchLocations = searchLocations as jest.MockedFunction<typeof searchLocations>;
    let resolveSecondSearch: ((value: LocationResult[]) => void) | null = null;

    mockedSearchLocations.mockImplementationOnce(
      (_query: string, options?: { signal?: AbortSignal }) =>
        new Promise<LocationResult[]>((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => reject(createAbortError()));
        }),
    );
    mockedSearchLocations.mockImplementationOnce(
      () =>
        new Promise<LocationResult[]>((resolve) => {
          resolveSecondSearch = resolve;
        }),
    );

    const { result } = renderHook(() => useSearch());

    act(() => {
      void result.current.performSearch("oslo");
    });
    act(() => {
      void result.current.performSearch("bergen");
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(true);

    const bergenResult: LocationResult = { id: "2", displayName: "Bergen", lat: 60.39, lon: 5.32 };
    await act(async () => {
      resolveSecondSearch?.([bergenResult]);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("keeps latest results after aborting the previous request", async () => {
    const mockedSearchLocations = searchLocations as jest.MockedFunction<typeof searchLocations>;
    let resolveSecondSearch: ((value: LocationResult[]) => void) | null = null;

    mockedSearchLocations.mockImplementationOnce(
      (_query: string, options?: { signal?: AbortSignal }) =>
        new Promise<LocationResult[]>((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => reject(createAbortError()));
        }),
    );
    mockedSearchLocations.mockImplementationOnce(
      () =>
        new Promise<LocationResult[]>((resolve) => {
          resolveSecondSearch = resolve;
        }),
    );

    const { result } = renderHook(() => useSearch());

    act(() => {
      void result.current.performSearch("oslo");
    });
    act(() => {
      void result.current.performSearch("bergen");
    });

    await act(async () => {
      await Promise.resolve();
    });

    const bergenResult: LocationResult = { id: "2", displayName: "Bergen", lat: 60.39, lon: 5.32 };
    await act(async () => {
      resolveSecondSearch?.([bergenResult]);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.locations).toEqual([bergenResult]);
      expect(result.current.searchError).toBeNull();
    });
    expect(mockedSearchLocations).toHaveBeenNthCalledWith(1, "oslo", expect.objectContaining({ signal: expect.any(Object) }));
    expect(mockedSearchLocations).toHaveBeenNthCalledWith(
      2,
      "bergen",
      expect.objectContaining({ signal: expect.any(Object) }),
    );
  });

  it("ignores stale non-abort errors from superseded requests", async () => {
    const mockedSearchLocations = searchLocations as jest.MockedFunction<typeof searchLocations>;
    let rejectFirstSearch: ((reason?: unknown) => void) | null = null;
    let resolveSecondSearch: ((value: LocationResult[]) => void) | null = null;

    mockedSearchLocations.mockImplementationOnce(
      () =>
        new Promise<LocationResult[]>((_resolve, reject) => {
          rejectFirstSearch = reject;
        }),
    );
    mockedSearchLocations.mockImplementationOnce(
      () =>
        new Promise<LocationResult[]>((resolve) => {
          resolveSecondSearch = resolve;
        }),
    );

    const { result } = renderHook(() => useSearch());

    act(() => {
      void result.current.performSearch("oslo");
    });
    act(() => {
      void result.current.performSearch("bergen");
    });

    await act(async () => {
      rejectFirstSearch?.(new Error("masked abort failure"));
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.searchError).toBeNull();
    expect(result.current.locations).toEqual([]);

    const bergenResult: LocationResult = { id: "2", displayName: "Bergen", lat: 60.39, lon: 5.32 };
    await act(async () => {
      resolveSecondSearch?.([bergenResult]);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.locations).toEqual([bergenResult]);
      expect(result.current.searchError).toBeNull();
    });
  });
});
