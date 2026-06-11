import { formatPrecip, formatTemperatureCelsius, formatWindSpeed } from "../../src/units";

describe("units formatters", () => {
  describe("formatTemperatureCelsius", () => {
    it("returns undefined for missing or non-finite input", () => {
      expect(formatTemperatureCelsius(undefined, "metric")).toBeUndefined();
      expect(formatTemperatureCelsius(Number.NaN, "metric")).toBeUndefined();
    });

    it("formats metric temperatures", () => {
      expect(formatTemperatureCelsius(0, "metric")).toBe("0 °C");
      expect(formatTemperatureCelsius(-3.6, "metric")).toBe("-4 °C");
      expect(formatTemperatureCelsius(10.4, "metric")).toBe("10 °C");
    });

    it("formats imperial temperatures", () => {
      expect(formatTemperatureCelsius(0, "imperial")).toBe("32 °F");
      expect(formatTemperatureCelsius(10, "imperial")).toBe("50 °F");
    });
  });

  describe("formatWindSpeed", () => {
    it("returns undefined for missing or non-finite input", () => {
      expect(formatWindSpeed(undefined, "metric")).toBeUndefined();
      expect(formatWindSpeed(Number.NaN, "metric")).toBeUndefined();
    });

    it("formats metric wind speed", () => {
      expect(formatWindSpeed(0, "metric")).toBe("0 m/s");
      expect(formatWindSpeed(5.4, "metric")).toBe("5 m/s");
    });

    it("formats imperial wind speed", () => {
      expect(formatWindSpeed(1, "imperial")).toBe("2 mph");
      expect(formatWindSpeed(10, "imperial")).toBe("22 mph");
    });
  });

  describe("formatPrecip", () => {
    it("returns undefined for missing or non-finite input", () => {
      expect(formatPrecip(undefined, "metric")).toBeUndefined();
      expect(formatPrecip(Number.NaN, "imperial")).toBeUndefined();
    });

    it("formats metric precipitation", () => {
      expect(formatPrecip(0, "metric")).toBe("0 mm");
      expect(formatPrecip(2.5, "metric")).toBe("2.5 mm");
    });

    it("formats imperial precipitation and trims trailing zeros", () => {
      expect(formatPrecip(25.4, "imperial")).toBe("1 in");
      expect(formatPrecip(63.5, "imperial")).toBe("2.5 in");
      expect(formatPrecip(2.54, "imperial")).toBe("0.1 in");
    });
  });
});
