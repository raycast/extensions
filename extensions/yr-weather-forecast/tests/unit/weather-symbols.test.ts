import { symbolToEmoji, symbolToCondition, emojiForWeatherData } from "../../src/utils/weather-symbols";

describe("symbolToEmoji", () => {
  it("clearsky_day -> sun", () => {
    expect(symbolToEmoji("clearsky_day")).toBe("☀️");
  });

  it("clearsky_night -> moon", () => {
    expect(symbolToEmoji("clearsky_night")).toBe("🌙");
  });

  it("fair_day -> partly cloudy sun", () => {
    expect(symbolToEmoji("fair_day")).toBe("🌤️");
  });

  it("fair_night -> moon", () => {
    expect(symbolToEmoji("fair_night")).toBe("🌙");
  });

  it("partlycloudy_day -> partly cloudy", () => {
    expect(symbolToEmoji("partlycloudy_day")).toBe("🌤️");
  });

  it("cloudy -> clouds", () => {
    expect(symbolToEmoji("cloudy")).toBe("☁️");
  });

  it("rain -> rain (not showers)", () => {
    expect(symbolToEmoji("rain")).toBe("🌧️");
  });

  it("lightrain -> rain emoji", () => {
    expect(symbolToEmoji("lightrain")).toBe("🌧️");
  });

  it("rainshowers_day -> shower emoji (distinct from plain rain)", () => {
    expect(symbolToEmoji("rainshowers_day")).toBe("🌦️");
  });

  it("snow -> snow", () => {
    expect(symbolToEmoji("snow")).toBe("🌨️");
  });

  it("heavysnow -> snow", () => {
    expect(symbolToEmoji("heavysnow")).toBe("🌨️");
  });

  it("sleet -> sleet", () => {
    expect(symbolToEmoji("sleet")).toBe("🌨️");
  });

  it("thunder -> thunder", () => {
    expect(symbolToEmoji("thunder")).toBe("⛈️");
  });

  it("fog -> fog", () => {
    expect(symbolToEmoji("fog")).toBe("🌫️");
  });

  it("unknown symbol -> empty string", () => {
    expect(symbolToEmoji("unknown_code")).toBe("");
  });

  it("undefined -> empty string", () => {
    expect(symbolToEmoji(undefined)).toBe("");
  });
});

describe("symbolToCondition", () => {
  it("clearsky -> 'Clear skies'", () => {
    expect(symbolToCondition("clearsky_day")).toBe("Clear skies");
  });

  it("rain -> 'Rainy'", () => {
    expect(symbolToCondition("rain")).toBe("Rainy");
  });

  it("heavyrain -> 'Heavy rain'", () => {
    expect(symbolToCondition("heavyrain")).toBe("Heavy rain");
  });

  it("snow -> 'Snowy'", () => {
    expect(symbolToCondition("snow")).toBe("Snowy");
  });

  it("thunder -> 'Thunderstorms'", () => {
    expect(symbolToCondition("thunder")).toBe("Thunderstorms");
  });

  it("undefined -> 'Unknown'", () => {
    expect(symbolToCondition(undefined)).toBe("Unknown");
  });

  it("unknown code -> 'Mixed conditions'", () => {
    expect(symbolToCondition("mystery_code")).toBe("Mixed conditions");
  });
});

describe("emojiForWeatherData", () => {
  it("returns emoji for known symbol", () => {
    expect(emojiForWeatherData("clearsky_day")).toBe("☀️");
  });

  it("returns fallback thermometer for unknown symbol", () => {
    expect(emojiForWeatherData("unknown")).toBe("🌡️");
  });

  it("returns fallback thermometer for undefined", () => {
    expect(emojiForWeatherData(undefined)).toBe("🌡️");
  });
});
