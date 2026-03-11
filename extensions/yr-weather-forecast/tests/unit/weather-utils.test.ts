jest.mock("../../src/utils/date-utils", () => {
  const actual = jest.requireActual("../../src/utils/date-utils");
  return {
    ...actual,
    formatTime: jest.fn(() => "mocked-time"),
  };
});

import { formatTime as formatTimeFromDateUtils } from "../../src/utils/date-utils";
import { formatTime } from "../../src/weather-utils";

describe("weather-utils formatTime", () => {
  it("delegates to date-utils formatTime with STANDARD format", () => {
    expect(formatTime("2026-03-08T12:00:00Z")).toBe("mocked-time");
    expect(formatTimeFromDateUtils).toHaveBeenCalledWith("2026-03-08T12:00:00Z", "STANDARD");
  });
});
