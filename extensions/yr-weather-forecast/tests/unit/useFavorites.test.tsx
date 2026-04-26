/** @jest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { useFavorites } from "../../src/hooks/useFavorites";
import type { FavoriteLocation } from "../../src/storage";
import { getFavorites } from "../../src/storage";
import { getWeather } from "../../src/weather-client";
import { getSunTimes } from "../../src/sunrise-client";

jest.mock("../../src/storage", () => ({
  addFavorite: jest.fn(async () => true),
  removeFavorite: jest.fn(async () => undefined),
  moveFavoriteUp: jest.fn(async () => undefined),
  moveFavoriteDown: jest.fn(async () => undefined),
  getFavorites: jest.fn(),
}));

jest.mock("../../src/weather-client", () => ({
  getWeather: jest.fn(),
}));

jest.mock("../../src/sunrise-client", () => ({
  getSunTimes: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useFavorites missing entry detection", () => {
  it("refetches entries that were only marked loading after cancellation", async () => {
    const alpha: FavoriteLocation = { id: "alpha", name: "Alpha", lat: 59.9, lon: 10.7 };
    const beta: FavoriteLocation = { id: "beta", name: "Beta", lat: 60.4, lon: 5.3 };

    const mockedGetFavorites = getFavorites as jest.MockedFunction<typeof getFavorites>;
    const mockedGetWeather = getWeather as jest.MockedFunction<typeof getWeather>;
    const mockedGetSunTimes = getSunTimes as jest.MockedFunction<typeof getSunTimes>;

    mockedGetFavorites.mockResolvedValueOnce([alpha, beta]).mockResolvedValueOnce([beta, alpha]);

    const neverResolvingWeather = new Promise<never>(() => undefined);
    const weatherEntry = { time: "2026-03-07T00:00:00Z", data: { instant: { details: { air_temperature: 12 } } } } as never;

    mockedGetWeather
      .mockImplementationOnce(() => neverResolvingWeather)
      .mockImplementationOnce(() => neverResolvingWeather)
      .mockResolvedValueOnce(weatherEntry)
      .mockResolvedValueOnce(weatherEntry);

    mockedGetSunTimes.mockResolvedValue({});

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(mockedGetWeather).toHaveBeenCalledTimes(2);
      expect(result.current.isFavoriteLoading(alpha.id ?? "", alpha.lat, alpha.lon)).toBe(true);
      expect(result.current.isFavoriteLoading(beta.id ?? "", beta.lat, beta.lon)).toBe(true);
    });

    await act(async () => {
      await result.current.refreshFavorites();
    });

    await waitFor(() => {
      // Regression assertion:
      // when loading-only keys are incorrectly treated as "already fetched",
      // this remains at 2 and favorites stay stuck in loading=true.
      expect(mockedGetWeather).toHaveBeenCalledTimes(4);
    });

    await waitFor(() => {
      expect(result.current.isFavoriteLoading(alpha.id ?? "", alpha.lat, alpha.lon)).toBe(false);
      expect(result.current.isFavoriteLoading(beta.id ?? "", beta.lat, beta.lon)).toBe(false);
      expect(result.current.getFavoriteWeather(alpha.id ?? "", alpha.lat, alpha.lon)).toBeDefined();
      expect(result.current.getFavoriteWeather(beta.id ?? "", beta.lat, beta.lon)).toBeDefined();
    });
  });

  it("retries previously failed favorites on refreshFavorites()", async () => {
    const oslo: FavoriteLocation = { id: "oslo", name: "Oslo", lat: 59.9, lon: 10.7 };

    const mockedGetFavorites = getFavorites as jest.MockedFunction<typeof getFavorites>;
    const mockedGetWeather = getWeather as jest.MockedFunction<typeof getWeather>;
    const mockedGetSunTimes = getSunTimes as jest.MockedFunction<typeof getSunTimes>;

    mockedGetFavorites.mockResolvedValueOnce([oslo]).mockResolvedValueOnce([oslo]);

    const weatherEntry = {
      time: "2026-03-07T00:00:00Z",
      data: { instant: { details: { air_temperature: 12 } } },
    } as never;

    mockedGetWeather.mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce(weatherEntry);
    mockedGetSunTimes.mockResolvedValue({});

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.hasFavoriteError("oslo", 59.9, 10.7)).toBe(true);
    });

    await act(async () => {
      await result.current.refreshFavorites();
    });

    await waitFor(() => {
      expect(mockedGetWeather).toHaveBeenCalledTimes(2);
      expect(result.current.hasFavoriteError("oslo", 59.9, 10.7)).toBe(false);
      expect(result.current.getFavoriteWeather("oslo", 59.9, 10.7)).toBeDefined();
    });
  });

  it("does not refetch weather when favorites are only reordered", async () => {
    const alpha: FavoriteLocation = { id: "osm:100", name: "Alpha", lat: 59.9, lon: 10.7 };
    const beta: FavoriteLocation = { id: "osm:200", name: "Beta", lat: 60.4, lon: 5.3 };

    const mockedGetFavorites = getFavorites as jest.MockedFunction<typeof getFavorites>;
    const mockedGetWeather = getWeather as jest.MockedFunction<typeof getWeather>;
    const mockedGetSunTimes = getSunTimes as jest.MockedFunction<typeof getSunTimes>;

    mockedGetFavorites.mockResolvedValueOnce([alpha, beta]).mockResolvedValueOnce([beta, alpha]);
    mockedGetWeather.mockResolvedValue({
      time: "2026-03-07T00:00:00Z",
      data: { instant: { details: { air_temperature: 12 } } },
    } as never);
    mockedGetSunTimes.mockResolvedValue({});

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(mockedGetWeather).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      await result.current.refreshFavorites();
    });

    await waitFor(() => {
      expect(mockedGetWeather).toHaveBeenCalledTimes(2);
    });
  });

  it("does not refetch weather when only favorite name changes", async () => {
    const oslo: FavoriteLocation = { id: "osm:100", name: "Oslo", lat: 59.9, lon: 10.7 };
    const renamed: FavoriteLocation = { ...oslo, name: "Oslo Renamed" };

    const mockedGetFavorites = getFavorites as jest.MockedFunction<typeof getFavorites>;
    const mockedGetWeather = getWeather as jest.MockedFunction<typeof getWeather>;
    const mockedGetSunTimes = getSunTimes as jest.MockedFunction<typeof getSunTimes>;

    mockedGetFavorites.mockResolvedValueOnce([oslo]).mockResolvedValueOnce([renamed]);
    mockedGetWeather.mockResolvedValue({
      time: "2026-03-07T00:00:00Z",
      data: { instant: { details: { air_temperature: 12 } } },
    } as never);
    mockedGetSunTimes.mockResolvedValue({});

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(mockedGetWeather).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.refreshFavorites();
    });

    await waitFor(() => {
      expect(mockedGetWeather).toHaveBeenCalledTimes(1);
    });
  });

  it("prunes keyed state records when a favorite is removed", async () => {
    const alpha: FavoriteLocation = { id: "osm:100", name: "Alpha", lat: 59.9, lon: 10.7 };
    const beta: FavoriteLocation = { id: "osm:200", name: "Beta", lat: 60.4, lon: 5.3 };

    const mockedGetFavorites = getFavorites as jest.MockedFunction<typeof getFavorites>;
    const mockedGetWeather = getWeather as jest.MockedFunction<typeof getWeather>;
    const mockedGetSunTimes = getSunTimes as jest.MockedFunction<typeof getSunTimes>;

    mockedGetFavorites.mockResolvedValueOnce([alpha, beta]).mockResolvedValueOnce([alpha]);
    mockedGetWeather.mockResolvedValue({
      time: "2026-03-07T00:00:00Z",
      data: { instant: { details: { air_temperature: 12 } } },
    } as never);
    mockedGetSunTimes.mockResolvedValue({});

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(mockedGetWeather).toHaveBeenCalledTimes(2);
      expect(result.current.getFavoriteWeather(beta.id ?? "", beta.lat, beta.lon)).toBeDefined();
    });

    await act(async () => {
      await result.current.refreshFavorites();
    });

    await waitFor(() => {
      expect(result.current.getFavoriteWeather(beta.id ?? "", beta.lat, beta.lon)).toBeUndefined();
      expect(result.current.getFavoriteSunTimes(beta.id ?? "", beta.lat, beta.lon)).toBeUndefined();
      expect(result.current.isFavoriteLoading(beta.id ?? "", beta.lat, beta.lon)).toBe(false);
      expect(result.current.hasFavoriteError(beta.id ?? "", beta.lat, beta.lon)).toBe(false);
    });
  });
});
