import { formatSummary, type WeatherSummary } from "../../src/weather-summary";

describe("formatSummary", () => {
  const baseSummary: WeatherSummary = {
    condition: "Cloudy",
    precipitationChance: "none",
    temperature: { min: undefined, max: undefined },
  };

  it("returns condition only when no precipitation or temperature range is available", () => {
    expect(formatSummary(baseSummary)).toBe("Cloudy");
  });

  it.each(["low", "medium", "high"] as const)(
    "includes %s precipitation chance text",
    (precipitationChance) => {
      expect(formatSummary({ ...baseSummary, precipitationChance })).toBe(
        `Cloudy, with a ${precipitationChance} chance of precipitation`,
      );
    },
  );

  it("formats single-point temperature as around X°C", () => {
    expect(formatSummary({ ...baseSummary, temperature: { min: 12.2, max: 12.4 } })).toBe("Cloudy, around 12°C");
  });

  it("formats temperature range when min and max differ", () => {
    expect(formatSummary({ ...baseSummary, temperature: { min: 4.2, max: 9.7 } })).toBe("Cloudy, from 4°C to 10°C");
  });

  it("combines condition, precipitation, and temperature range", () => {
    expect(
      formatSummary({
        condition: "Rain",
        precipitationChance: "high",
        temperature: { min: 5.4, max: 8.8 },
      }),
    ).toBe("Rain, with a high chance of precipitation, from 5°C to 9°C");
  });
});
