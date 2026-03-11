import { symbolCode, precipitationAmount } from "../../src/utils-forecast";
import type { TimeseriesEntry } from "../../src/weather-client";

function makeEntry(overrides: {
  next_1_hours?: { symbol?: string; precip?: number };
  next_6_hours?: { symbol?: string; precip?: number };
  next_12_hours?: { symbol?: string; precip?: number };
} = {}): TimeseriesEntry {
  return {
    time: "2026-03-06T12:00:00Z",
    data: {
      instant: { details: { air_temperature: 5, wind_speed: 3 } },
      next_1_hours: overrides.next_1_hours
        ? {
            summary: { symbol_code: overrides.next_1_hours.symbol },
            details: { precipitation_amount: overrides.next_1_hours.precip },
          }
        : undefined,
      next_6_hours: overrides.next_6_hours
        ? {
            summary: { symbol_code: overrides.next_6_hours.symbol },
            details: { precipitation_amount: overrides.next_6_hours.precip },
          }
        : undefined,
      next_12_hours: overrides.next_12_hours
        ? {
            summary: { symbol_code: overrides.next_12_hours.symbol },
            details: { precipitation_amount: overrides.next_12_hours.precip },
          }
        : undefined,
    },
  };
}

describe("symbolCode", () => {
  it("returns next_1_hours symbol when present", () => {
    const entry = makeEntry({ next_1_hours: { symbol: "clearsky_day" } });
    expect(symbolCode(entry)).toBe("clearsky_day");
  });

  it("falls back to next_6_hours when next_1_hours is absent", () => {
    const entry = makeEntry({ next_6_hours: { symbol: "rain" } });
    expect(symbolCode(entry)).toBe("rain");
  });

  it("falls back to next_12_hours when 1h and 6h are absent", () => {
    const entry = makeEntry({ next_12_hours: { symbol: "snow" } });
    expect(symbolCode(entry)).toBe("snow");
  });

  it("returns undefined when all intervals are absent", () => {
    const entry = makeEntry();
    expect(symbolCode(entry)).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(symbolCode(undefined)).toBeUndefined();
  });
});

describe("precipitationAmount", () => {
  it("returns next_1_hours precipitation when present", () => {
    const entry = makeEntry({ next_1_hours: { precip: 2.5 } });
    expect(precipitationAmount(entry)).toBe(2.5);
  });

  it("falls back to next_6_hours precipitation", () => {
    const entry = makeEntry({ next_6_hours: { precip: 10 } });
    expect(precipitationAmount(entry)).toBe(10);
  });

  it("falls back to next_12_hours precipitation", () => {
    const entry = makeEntry({ next_12_hours: { precip: 0 } });
    expect(precipitationAmount(entry)).toBe(0);
  });

  it("returns undefined when all intervals are absent", () => {
    const entry = makeEntry();
    expect(precipitationAmount(entry)).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(precipitationAmount(undefined)).toBeUndefined();
  });
});
