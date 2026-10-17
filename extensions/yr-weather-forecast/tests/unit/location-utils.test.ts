import type { LocationResult } from "../../src/location-search";
import { LocationUtils } from "../../src/utils/location-utils";

function location(overrides: Partial<LocationResult>): LocationResult {
  return {
    id: "1",
    displayName: "Test",
    lat: 59.9,
    lon: 10.7,
    ...overrides,
  };
}

describe("LocationUtils.getLocationEmoji", () => {
  it("returns house emoji for house/building", () => {
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "house" }))).toBe("🏠");
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "building" }))).toBe("🏠");
  });

  it("returns neighborhood emoji for neighbourhood/suburb/town/village/hamlet", () => {
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "neighbourhood" }))).toBe("🏘️");
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "suburb" }))).toBe("🏘️");
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "town" }))).toBe("🏘️");
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "village" }))).toBe("🏘️");
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "hamlet" }))).toBe("🏘️");
  });

  it("returns city emoji for city", () => {
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "city" }))).toBe("🏙️");
  });

  it("returns municipality emoji for municipality", () => {
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "municipality" }))).toBe("🏛️");
  });

  it("returns map emoji for county/state", () => {
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "county" }))).toBe("🗺️");
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "state" }))).toBe("🗺️");
  });

  it("returns globe emoji for country", () => {
    expect(LocationUtils.getLocationEmoji(location({ addresstype: "country" }))).toBe("🌍");
  });

  it("falls back to location type when addresstype is absent", () => {
    expect(LocationUtils.getLocationEmoji(location({ type: "town", addresstype: undefined }))).toBe("🏘️");
  });

  it("falls back to osm class/type defaults", () => {
    expect(LocationUtils.getLocationEmoji(location({ addresstype: undefined, class: "place" }))).toBe("📍");
    expect(
      LocationUtils.getLocationEmoji(location({ addresstype: undefined, class: "boundary", type: "administrative" })),
    ).toBe("🏛️");
    expect(LocationUtils.getLocationEmoji(location({ addresstype: undefined, class: "amenity", type: "cafe" }))).toBe(
      "📍",
    );
  });
});

describe("LocationUtils canonical identity helpers", () => {
  it("createFavoriteFromSearchResult canonicalizes numeric IDs to osm:", () => {
    expect(LocationUtils.createFavoriteFromSearchResult("123", "Oslo", 59.9, 10.7)).toMatchObject({
      id: "osm:123",
      name: "Oslo",
      lat: 59.9,
      lon: 10.7,
    });
  });

  it("createFavoriteFromSearchResult canonicalizes coord strings", () => {
    expect(LocationUtils.createFavoriteFromSearchResult("59.9,10.7", "Coords", 0, 0).id).toBe("coord:59.900,10.700");
  });

  it("getLocationKey falls back to coordinate key when id is undefined", () => {
    expect(LocationUtils.getLocationKey(undefined, 59.9139, 10.7522)).toBe("coord:59.914,10.752");
  });
});

describe("LocationUtils.sortLocationsByPrecision with query relevance", () => {
  it("prioritizes exact diacritic-insensitive name matches", () => {
    const bodoe = location({
      id: "1",
      displayName: "Bodø Municipality, Nordland, Norge",
      addresstype: "municipality",
    });
    const bordeaux = location({
      id: "2",
      displayName: "Bordeaux Municipality, Gironde, France",
      addresstype: "municipality",
    });

    const sorted = LocationUtils.sortLocationsByPrecision([bordeaux, bodoe], "bodo");
    expect(sorted[0].displayName).toContain("Bodø");
  });

  it("prioritizes prefix matches over unrelated higher-precision types", () => {
    const bod = location({
      id: "1",
      displayName: "Bod Municipality, Brașov, Romania",
      addresstype: "municipality",
    });
    const guingamp = location({
      id: "2",
      displayName: "Guingamp, Côtes-d'Armor, France",
      addresstype: "city",
    });

    const sorted = LocationUtils.sortLocationsByPrecision([guingamp, bod], "bod");
    expect(sorted[0].displayName).toContain("Bod Municipality");
  });

  it("falls back to precision sorting when query is not provided", () => {
    const municipality = location({
      id: "1",
      displayName: "Municipality Match",
      addresstype: "municipality",
    });
    const city = location({
      id: "2",
      displayName: "City Match",
      addresstype: "city",
    });

    const sorted = LocationUtils.sortLocationsByPrecision([municipality, city]);
    expect(sorted[0].displayName).toBe("City Match");
  });
});
