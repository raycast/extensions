import { locationKeyFromCoords, locationKeyFromIdOrCoords } from "../../src/utils/location-key";

describe("locationKeyFromCoords", () => {
  it("formats lat/lon to 3 decimal places with coord: prefix", () => {
    expect(locationKeyFromCoords(59.9139, 10.7522)).toBe("coord:59.914,10.752");
  });

  it("handles negative coordinates", () => {
    expect(locationKeyFromCoords(-33.868, 151.209)).toBe("coord:-33.868,151.209");
  });

  it("rounds to 3 decimal places", () => {
    expect(locationKeyFromCoords(1.0, 2.0)).toBe("coord:1.000,2.000");
  });
});

describe("locationKeyFromIdOrCoords", () => {
  describe("prefixed IDs are normalized", () => {
    it("normalizes osm: prefix and trims payload", () => {
      expect(locationKeyFromIdOrCoords(" OSM:12345 ", 0, 0)).toBe("osm:12345");
    });

    it("normalizes coord: prefix precision", () => {
      expect(locationKeyFromIdOrCoords("coord:59.9,10.7", 0, 0)).toBe("coord:59.900,10.700");
    });

    it("normalizes id: prefix and trims payload", () => {
      expect(locationKeyFromIdOrCoords(" ID:custom-abc ", 0, 0)).toBe("id:custom-abc");
    });
  });

  describe("malformed prefixed IDs fall back to coordinates", () => {
    it("falls back for invalid osm payload", () => {
      expect(locationKeyFromIdOrCoords("osm:not-a-number", 59.91, 10.75)).toBe("coord:59.910,10.750");
    });

    it("falls back for invalid coord payload", () => {
      expect(locationKeyFromIdOrCoords("coord:not,coords", 59.91, 10.75)).toBe("coord:59.910,10.750");
    });

    it("falls back for empty prefixed payload", () => {
      expect(locationKeyFromIdOrCoords("id:   ", 59.91, 10.75)).toBe("coord:59.910,10.750");
    });
  });

  describe("already canonical forms remain canonical", () => {
    it("keeps canonical osm id", () => {
      expect(locationKeyFromIdOrCoords("osm:12345", 0, 0)).toBe("osm:12345");
    });

    it("keeps canonical coord key", () => {
      expect(locationKeyFromIdOrCoords("coord:59.914,10.752", 0, 0)).toBe("coord:59.914,10.752");
    });

    it("keeps canonical id key", () => {
      expect(locationKeyFromIdOrCoords("id:custom-abc", 0, 0)).toBe("id:custom-abc");
    });
  });

  describe("numeric IDs get osm: prefix", () => {
    it("wraps a numeric string with osm:", () => {
      expect(locationKeyFromIdOrCoords("12345", 0, 0)).toBe("osm:12345");
    });
  });

  describe("legacy ID formats fall back to coord key", () => {
    it("'favorite-*' ID uses the provided coordinates", () => {
      expect(locationKeyFromIdOrCoords("favorite-59.9-10.7", 59.9, 10.7)).toBe("coord:59.900,10.700");
    });

    it("comma-separated lat,lon string becomes a coord key", () => {
      expect(locationKeyFromIdOrCoords("59.9,10.7", 0, 0)).toBe("coord:59.900,10.700");
    });
  });

  describe("undefined id falls back to coord key", () => {
    it("uses lat/lon when id is undefined", () => {
      expect(locationKeyFromIdOrCoords(undefined, 59.9139, 10.7522)).toBe("coord:59.914,10.752");
    });
  });

  describe("unrecognised non-numeric IDs get id: prefix", () => {
    it("wraps an opaque string with id:", () => {
      expect(locationKeyFromIdOrCoords("some-external-id", 0, 0)).toBe("id:some-external-id");
    });
  });
});
