import { LocalStorage } from "@raycast/api";
import { LocationUtils } from "../../src/utils/location-utils";
import { addFavorite, getFavorites, isFavorite, removeFavorite, type FavoriteLocation } from "../../src/storage";
import type { LocationResult } from "../../src/location-search";

const store = (LocalStorage as unknown as { _store: Record<string, string> })._store;

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
  jest.clearAllMocks();
});

describe("location identity flow", () => {
  it("keeps canonical identity stable across search -> favorites -> forecast style checks", async () => {
    const searchResult: LocationResult = {
      id: "12345",
      displayName: "Oslo",
      lat: 59.9139,
      lon: 10.7522,
    };

    const favorite = LocationUtils.createFavoriteFromSearchResult(
      searchResult.id,
      searchResult.displayName,
      searchResult.lat,
      searchResult.lon,
    );
    expect(favorite.id).toBe("osm:12345");

    await addFavorite(favorite);
    const stored = await getFavorites();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe("osm:12345");

    // Simulate forecast identity derivation when opened from favorites list.
    const forecastFavLike: FavoriteLocation = {
      id: LocationUtils.getLocationKey(stored[0].id, stored[0].lat, stored[0].lon),
      name: stored[0].name,
      lat: stored[0].lat,
      lon: stored[0].lon,
    };
    expect(forecastFavLike.id).toBe("osm:12345");

    expect(await isFavorite(forecastFavLike)).toBe(true);

    // Alternate incoming provider shape should still match same canonical favorite.
    const providerShape: FavoriteLocation = {
      id: "12345",
      name: "Oslo Alt Name",
      lat: 59.9139,
      lon: 10.7522,
    };
    expect(await isFavorite(providerShape)).toBe(true);

    await removeFavorite(providerShape);
    expect(await getFavorites()).toHaveLength(0);
  });
});
