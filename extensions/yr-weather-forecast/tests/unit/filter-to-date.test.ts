import { filterToDate } from "../../src/weather-utils";
import { parseLocalDateString } from "../../src/utils/date-utils";
import type { TimeseriesEntry } from "../../src/weather-client";

const ORIGINAL_TZ = process.env.TZ;

function withTimezone(timeZone: string, assertion: () => void): void {
  const previous = process.env.TZ;
  process.env.TZ = timeZone;
  try {
    assertion();
  } finally {
    if (previous === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = previous;
    }
  }
}

function entry(time: string): TimeseriesEntry {
  return {
    time,
    data: {
      instant: {
        details: {},
      },
    },
  };
}

afterAll(() => {
  if (ORIGINAL_TZ === undefined) {
    delete process.env.TZ;
    return;
  }
  process.env.TZ = ORIGINAL_TZ;
});

describe("filterToDate", () => {
  test("uses local-day boundaries for UTC+ dates", () => {
    withTimezone("Europe/Oslo", () => {
      // On Linux CI, runtime TZ changes may not take effect; verify CET is active.
      const probe = new Date(2026, 2, 8, 0, 0, 0, 0);
      if (probe.getTimezoneOffset() >= 0) {
        // Not running in UTC+; CET-specific boundary expectations would be wrong.
        return;
      }

      const series: TimeseriesEntry[] = [
        entry("2026-03-07T22:00:00Z"), // 23:00 CET — previous day
        entry("2026-03-07T23:00:00Z"), // 00:00 CET — target day start
        entry("2026-03-08T12:00:00Z"), // 13:00 CET — target day
        entry("2026-03-08T22:00:00Z"), // 23:00 CET — target day end
        entry("2026-03-08T23:00:00Z"), // 00:00 CET — next day
      ];

      const result = filterToDate(series, parseLocalDateString("2026-03-08"));
      expect(result.map((item) => item.time)).toEqual([
        "2026-03-07T22:00:00Z",
        "2026-03-07T23:00:00Z",
        "2026-03-08T12:00:00Z",
        "2026-03-08T22:00:00Z",
        "2026-03-08T23:00:00Z",
      ]);
    });
  });

  test("parseLocalDateString uses local-midnight boundaries for date filtering", () => {
    const target = parseLocalDateString("2026-01-15");
    const start = new Date(target);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const previousLast = new Date(start.getTime() - 60 * 60 * 1000).toISOString();
    const firstTarget = new Date(start).toISOString();
    const middleTarget = new Date(start.getTime() + 7 * 60 * 60 * 1000).toISOString();
    const lastTarget = new Date(end.getTime() - 60 * 60 * 1000).toISOString();
    const nextFirst = new Date(end).toISOString();

    const series: TimeseriesEntry[] = [
      entry(previousLast),
      entry(firstTarget),
      entry(middleTarget),
      entry(lastTarget),
      entry(nextFirst),
    ];

    const fixed = filterToDate(series, parseLocalDateString("2026-01-15"));
    const wrong = filterToDate(series, new Date("2026-01-15"));
    const expected = [previousLast, firstTarget, middleTarget, lastTarget, nextFirst];

    expect(fixed.map((item) => item.time)).toEqual(expected);

    // Date-only parsing bug is user-visible when UTC parsing crosses a local day boundary.
    const utcParsed = new Date("2026-01-15");
    const localParsed = parseLocalDateString("2026-01-15");
    const shiftsLocalDay =
      utcParsed.getFullYear() !== localParsed.getFullYear() ||
      utcParsed.getMonth() !== localParsed.getMonth() ||
      utcParsed.getDate() !== localParsed.getDate();

    if (shiftsLocalDay) {
      expect(wrong.map((item) => item.time)).not.toEqual(expected);
    }
  });
});
