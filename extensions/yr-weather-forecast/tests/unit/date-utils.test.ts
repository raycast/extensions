import { parseLocalDateString, toLocalDateString } from "../../src/utils/date-utils";

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

afterAll(() => {
  if (ORIGINAL_TZ === undefined) {
    delete process.env.TZ;
    return;
  }
  process.env.TZ = ORIGINAL_TZ;
});

describe("local date string helpers", () => {
  test.each(["Europe/Oslo", "UTC", "America/New_York"])(
    "round-trips local dates in %s",
    (timeZone: string) => {
      withTimezone(timeZone, () => {
        const parsed = parseLocalDateString("2026-03-08");
        expect(parsed.getFullYear()).toBe(2026);
        expect(parsed.getMonth()).toBe(2);
        expect(parsed.getDate()).toBe(8);
        expect(parsed.getHours()).toBe(0);
        expect(parsed.getMinutes()).toBe(0);
        expect(toLocalDateString(parsed)).toBe("2026-03-08");
      });
    },
  );

  test("avoids UTC date shift in UTC+ timezone", () => {
    withTimezone("Europe/Oslo", () => {
      const localMidnight = new Date(2026, 2, 8, 0, 0, 0, 0);

      // getTimezoneOffset() < 0 means UTC+ (e.g. CET = -60).
      // On Linux CI, runtime TZ changes may not take effect; guard accordingly.
      if (localMidnight.getTimezoneOffset() < 0) {
        expect(localMidnight.toISOString().slice(0, 10)).toBe("2026-03-07");
      }

      // Helper must preserve local calendar date regardless of timezone.
      expect(toLocalDateString(localMidnight)).toBe("2026-03-08");
    });
  });

  test("rejects invalid local date strings", () => {
    expect(() => parseLocalDateString("2026/03/08")).toThrow("Invalid local date string");
  });
});
import { getPeriodName } from "../../src/utils/date-utils";

describe("getPeriodName", () => {
  it.each([
    [0, "Night"],
    [1, "Night"],
    [5, "Night"],
    [6, "Morning"],
    [11, "Morning"],
    [12, "Afternoon"],
    [17, "Afternoon"],
    [18, "Evening"],
    [23, "Evening"],
  ] as [number, "Night" | "Morning" | "Afternoon" | "Evening"][])(
    "hour %i -> %s",
    (hour, expected) => {
      expect(getPeriodName(hour)).toBe(expected);
    }
  );
});
