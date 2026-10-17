jest.mock("../../src/clock", () => ({
  getClockFormat: jest.fn(() => "24h"),
}));

import { getClockFormat } from "../../src/clock";
import {
  DATE_FORMATS,
  TIME_FORMATS,
  formatDate,
  formatDateCustom,
  formatLastUpdated,
  formatTime,
  formatTimeCustom,
  formatTimeRange,
} from "../../src/utils/date-utils";

const mockedGetClockFormat = getClockFormat as jest.MockedFunction<typeof getClockFormat>;

describe("date/time formatter utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("formatDate", () => {
    it("formats Date with predefined options", () => {
      const date = new Date("2026-03-08T12:00:00Z");
      const spy = jest.spyOn(date, "toLocaleDateString").mockReturnValue("formatted");

      expect(formatDate(date, "SHORT_DAY")).toBe("formatted");
      expect(spy).toHaveBeenCalledWith(undefined, DATE_FORMATS.SHORT_DAY);
    });

    it("accepts ISO strings", () => {
      const spy = jest.spyOn(Date.prototype, "toLocaleDateString").mockReturnValue("formatted");

      expect(formatDate("2026-03-08T12:00:00Z", "FULL_DATE")).toBe("formatted");
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("formatTime", () => {
    it("uses 12h clock preference for STANDARD", () => {
      mockedGetClockFormat.mockReturnValue("12h");
      const spy = jest.spyOn(Date.prototype, "toLocaleTimeString").mockReturnValue("12:00 PM");

      expect(formatTime("2026-03-08T12:00:00Z", "STANDARD")).toBe("12:00 PM");
      expect(spy).toHaveBeenCalledWith(undefined, { ...TIME_FORMATS.STANDARD, hour12: true });
    });

    it("uses 24h clock preference for MILITARY", () => {
      mockedGetClockFormat.mockReturnValue("24h");
      const spy = jest.spyOn(Date.prototype, "toLocaleTimeString").mockReturnValue("12:00");

      expect(formatTime("2026-03-08T12:00:00Z", "MILITARY")).toBe("12:00");
      expect(spy).toHaveBeenCalledWith(undefined, { ...TIME_FORMATS.MILITARY, hour12: false });
    });

    it("keeps HOUR_ONLY compact even with 12h clock preference", () => {
      mockedGetClockFormat.mockReturnValue("12h");
      const spy = jest.spyOn(Date.prototype, "toLocaleTimeString").mockReturnValue("12");

      expect(formatTime("2026-03-08T12:00:00Z", "HOUR_ONLY")).toBe("12");
      expect(spy).toHaveBeenCalledWith(undefined, TIME_FORMATS.HOUR_ONLY);
    });
  });

  describe("custom formatters", () => {
    it("passes custom options to formatDateCustom", () => {
      const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
      const spy = jest.spyOn(Date.prototype, "toLocaleDateString").mockReturnValue("Mar 8");

      expect(formatDateCustom("2026-03-08T12:00:00Z", options)).toBe("Mar 8");
      expect(spy).toHaveBeenCalledWith(undefined, options);
    });

    it("passes custom options to formatTimeCustom", () => {
      const options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false };
      const spy = jest.spyOn(Date.prototype, "toLocaleTimeString").mockReturnValue("12:00");

      expect(formatTimeCustom("2026-03-08T12:00:00Z", options)).toBe("12:00");
      expect(spy).toHaveBeenCalledWith(undefined, options);
    });
  });

  describe("formatTimeRange", () => {
    it("joins two formatted times", () => {
      const spy = jest
        .spyOn(Date.prototype, "toLocaleTimeString")
        .mockReturnValueOnce("09:00")
        .mockReturnValueOnce("12:00");

      expect(formatTimeRange("2026-03-08T09:00:00Z", "2026-03-08T12:00:00Z", "MILITARY")).toBe("09:00 - 12:00");
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe("formatLastUpdated", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-03-08T12:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("returns relative labels for recent timestamps", () => {
      expect(formatLastUpdated("2026-03-08T11:59:30Z")).toBe("now");
      expect(formatLastUpdated("2026-03-08T11:59:00Z")).toBe("1 min ago");
      expect(formatLastUpdated("2026-03-08T11:58:00Z")).toBe("2 mins ago");
      expect(formatLastUpdated("2026-03-08T11:00:00Z")).toBe("1 hr ago");
      expect(formatLastUpdated("2026-03-08T10:00:00Z")).toBe("2 hrs ago");
      expect(formatLastUpdated("2026-03-07T12:00:00Z")).toBe("1 day ago");
      expect(formatLastUpdated("2026-03-06T12:00:00Z")).toBe("2 days ago");
    });

    it("uses formatted date/time for timestamps older than seven days", () => {
      mockedGetClockFormat.mockReturnValue("24h");
      jest.spyOn(Date.prototype, "toLocaleTimeString").mockReturnValue("12:00");
      jest.spyOn(Date.prototype, "toLocaleDateString").mockReturnValue("Sat, Feb 28");

      expect(formatLastUpdated("2026-02-28T12:00:00Z")).toBe("Sat, Feb 28 at 12:00");
    });
  });
});
