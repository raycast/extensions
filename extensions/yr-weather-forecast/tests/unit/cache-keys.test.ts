import { coordSuffix, graphCacheKey } from "../../src/cache-keys";
import { locationKeyFromCoords } from "../../src/utils/location-key";

describe("coordSuffix", () => {
  it("uses the same precision contract as locationKeyFromCoords", () => {
    const lat = 59.9139;
    const lon = 10.7522;
    const coordKey = locationKeyFromCoords(lat, lon);
    const coordOnly = coordKey.replace("coord:", "");
    expect(coordSuffix(lat, lon)).toBe(coordOnly);
  });
});

describe("graphCacheKey", () => {
  const base = {
    locationKey: "osm:100",
    mode: "detailed" as const,
    paletteId: "dark" as const,
    seriesLength: 12,
    firstTime: "2026-03-07T00:00:00Z",
    lastTime: "2026-03-08T00:00:00Z",
  };

  it("is deterministic regardless of sunDates order/duplicates", () => {
    const keyA = graphCacheKey({
      ...base,
      sunDates: ["2026-03-08", "2026-03-07", "2026-03-07"],
    });
    const keyB = graphCacheKey({
      ...base,
      sunDates: ["2026-03-07", "2026-03-08"],
    });

    expect(keyA).toBe(keyB);
  });

  it("encodes special characters in targetDate", () => {
    const key = graphCacheKey({
      ...base,
      targetDate: "2026-03-07+special/value",
      sunDates: [],
    });

    expect(key).toContain("targetDate=2026-03-07%2Bspecial%2Fvalue");
  });
});
