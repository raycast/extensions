jest.mock("../../src/utils/date-utils", () => {
  const actual = jest.requireActual("../../src/utils/date-utils");
  return {
    ...actual,
    formatTime: jest.fn(() => "mocked-time"),
  };
});

import { formatTime as formatTimeFromDateUtils } from "../../src/utils/date-utils";
import { buildWeatherTable, formatTime } from "../../src/weather-utils";
import type { TimeseriesEntry } from "../../src/weather-client";

describe("weather-utils formatTime", () => {
  it("delegates to date-utils formatTime with STANDARD format", () => {
    expect(formatTime("2026-03-08T12:00:00Z")).toBe("mocked-time");
    expect(formatTimeFromDateUtils).toHaveBeenCalledWith("2026-03-08T12:00:00Z", "STANDARD");
  });
});

function entry(time: string): TimeseriesEntry {
  return {
    time,
    data: {
      instant: {
        details: {
          air_temperature: 5,
          wind_speed: 2,
          wind_from_direction: 90,
        },
      },
    },
  };
}

describe("buildWeatherTable", () => {
  it("omits the direction column when wind direction is disabled", () => {
    const table = buildWeatherTable([entry("2026-03-08T12:00:00Z")], { showDirection: false });

    expect(table.split("\n")[0]).toBe("Time | Weather | Temp | Wind | Precip");
  });

  it("does not mutate the input series order", () => {
    const series = [entry("2026-03-08T12:00:00Z"), entry("2026-03-08T09:00:00Z")];

    buildWeatherTable(series);

    expect(series.map((item) => item.time)).toEqual(["2026-03-08T12:00:00Z", "2026-03-08T09:00:00Z"]);
  });
});
