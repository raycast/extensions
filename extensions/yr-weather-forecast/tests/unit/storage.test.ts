import {
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
  isSameLocation,
  moveFavoriteUp,
  moveFavoriteDown,
  type FavoriteLocation,
} from "../../src/storage";
import { LocalStorage } from "@raycast/api";

const store = (LocalStorage as unknown as { _store: Record<string, string> })._store;

const OSLO: FavoriteLocation = { id: "osm:100", name: "Oslo", lat: 59.914, lon: 10.752 };
const BERGEN: FavoriteLocation = { id: "osm:200", name: "Bergen", lat: 60.391, lon: 5.322 };
const TRONDHEIM: FavoriteLocation = { id: "osm:300", name: "Trondheim", lat: 63.43, lon: 10.395 };

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  jest.clearAllMocks();
});

describe("getFavorites", () => {
  it("returns [] when storage is empty", async () => {
    expect(await getFavorites()).toEqual([]);
  });

  it("returns [] when stored JSON is corrupt", async () => {
    store["favorite-locations"] = "not-json{{";
    expect(await getFavorites()).toEqual([]);
  });

  it("returns [] when stored value is not an array", async () => {
    store["favorite-locations"] = JSON.stringify({ not: "an array" });
    expect(await getFavorites()).toEqual([]);
  });

  it("migrates and deduplicates mixed legacy IDs to one canonical favorite", async () => {
    store["favorite-locations"] = JSON.stringify([
      { id: "100", name: "Oslo numeric", lat: 59.9139, lon: 10.7522 },
      { id: "osm:100", name: "Oslo canonical", lat: 59.9139, lon: 10.7522 },
      { id: "OSM:100", name: "Oslo uppercase", lat: 59.9139, lon: 10.7522 },
    ]);

    const favorites = await getFavorites();
    expect(favorites).toHaveLength(1);
    expect(favorites[0]).toMatchObject({ id: "osm:100", name: "Oslo numeric" });
  });

  it("normalizes malformed prefixed IDs to coordinate key during migration", async () => {
    store["favorite-locations"] = JSON.stringify([{ id: "osm:not-number", name: "Legacy", lat: 59.9139, lon: 10.7522 }]);

    const favorites = await getFavorites();
    expect(favorites).toHaveLength(1);
    expect(favorites[0].id).toBe("coord:59.914,10.752");
  });
});

describe("addFavorite / getFavorites round-trip", () => {
  it("stores a favorite and retrieves it", async () => {
    await addFavorite(OSLO);
    const favorites = await getFavorites();
    expect(favorites).toHaveLength(1);
    expect(favorites[0].name).toBe("Oslo");
  });

  it("addFavorite returns true on success", async () => {
    expect(await addFavorite(OSLO)).toBe(true);
  });

  it("addFavorite returns false and does not duplicate identical location", async () => {
    await addFavorite(OSLO);
    expect(await addFavorite(OSLO)).toBe(false);
    expect(await getFavorites()).toHaveLength(1);
  });

  it("deduplicates by canonical key regardless of name field", async () => {
    await addFavorite(OSLO);
    await addFavorite({ ...OSLO, name: "Oslo (renamed)" });
    expect(await getFavorites()).toHaveLength(1);
  });
});

describe("removeFavorite", () => {
  it("removes the matching favorite", async () => {
    await addFavorite(OSLO);
    await addFavorite(BERGEN);
    await removeFavorite(OSLO);
    const favorites = await getFavorites();
    expect(favorites).toHaveLength(1);
    expect(favorites[0].name).toBe("Bergen");
  });

  it("is a no-op when favorite does not exist", async () => {
    await addFavorite(OSLO);
    await removeFavorite(BERGEN);
    expect(await getFavorites()).toHaveLength(1);
  });
});

describe("isFavorite", () => {
  it("returns true for a stored favorite", async () => {
    await addFavorite(OSLO);
    expect(await isFavorite(OSLO)).toBe(true);
  });

  it("returns false when not stored", async () => {
    expect(await isFavorite(OSLO)).toBe(false);
  });

  it("matches canonical favorite when queried by numeric provider ID", async () => {
    await addFavorite(OSLO);
    expect(await isFavorite({ ...OSLO, id: "100" })).toBe(true);
  });
});

describe("isSameLocation", () => {
  it("is true for identical canonical keys", () => {
    expect(isSameLocation(OSLO, { ...OSLO, name: "Oslo (copy)" })).toBe(true);
  });

  it("is false for different locations", () => {
    expect(isSameLocation(OSLO, BERGEN)).toBe(false);
  });
});

describe("moveFavoriteUp / moveFavoriteDown", () => {
  beforeEach(async () => {
    await addFavorite(OSLO);
    await addFavorite(BERGEN);
    await addFavorite(TRONDHEIM);
  });

  it("moveFavoriteUp moves second item to first", async () => {
    await moveFavoriteUp(BERGEN);
    const favorites = await getFavorites();
    expect(favorites[0].name).toBe("Bergen");
    expect(favorites[1].name).toBe("Oslo");
  });

  it("moveFavoriteDown moves first item to second", async () => {
    await moveFavoriteDown(OSLO);
    const favorites = await getFavorites();
    expect(favorites[0].name).toBe("Bergen");
    expect(favorites[1].name).toBe("Oslo");
  });

  it("moveFavoriteUp on the first item is a no-op", async () => {
    await moveFavoriteUp(OSLO);
    const favorites = await getFavorites();
    expect(favorites[0].name).toBe("Oslo");
  });

  it("moveFavoriteDown on the last item is a no-op", async () => {
    await moveFavoriteDown(TRONDHEIM);
    const favorites = await getFavorites();
    expect(favorites[2].name).toBe("Trondheim");
  });
});
