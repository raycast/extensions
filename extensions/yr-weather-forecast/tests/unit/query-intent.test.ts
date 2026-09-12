import { parseQueryIntent } from "../../src/query-intent";

// Fixed reference point: Friday 2026-03-06 at noon local time.
// Dates produced by parseQueryIntent use local time (setHours(0,0,0,0)),
// so assertions must use getFullYear/getMonth/getDate rather than toISOString()
// which returns UTC and will differ in non-UTC timezones.
const NOW = new Date("2026-03-06T12:00:00");

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

describe("parseQueryIntent", () => {
  describe("empty input", () => {
    it("returns {} for empty string", () => {
      expect(parseQueryIntent("", NOW)).toEqual({});
    });

    it("returns {} for whitespace-only string", () => {
      expect(parseQueryIntent("   ", NOW)).toEqual({});
    });
  });

  describe("plain location (no date tokens)", () => {
    it("returns locationQuery for a plain city name", () => {
      expect(parseQueryIntent("Oslo", NOW)).toEqual({ locationQuery: "Oslo" });
    });

    it("preserves original casing in locationQuery", () => {
      expect(parseQueryIntent("Bergen", NOW)).toEqual({ locationQuery: "Bergen" });
    });
  });

  describe("relative date tokens — English", () => {
    it("'today' yields start of current day, no locationQuery", () => {
      const result = parseQueryIntent("today", NOW);
      expect(result.locationQuery).toBeUndefined();
      expect(result.targetDate).toBeDefined();
      expect(localDateStr(result.targetDate!)).toBe("2026-03-06");
      expect(result.targetDate!.getHours()).toBe(0);
    });

    it("'tomorrow' yields next day midnight", () => {
      const result = parseQueryIntent("tomorrow", NOW);
      expect(result.targetDate).toBeDefined();
      expect(localDateStr(result.targetDate!)).toBe("2026-03-07");
    });

    it("combined: 'Bergen tomorrow' splits location and date", () => {
      const result = parseQueryIntent("Bergen tomorrow", NOW);
      expect(result.locationQuery).toBe("Bergen");
      expect(result.targetDate).toBeDefined();
      expect(localDateStr(result.targetDate!)).toBe("2026-03-07");
    });
  });

  describe("relative date tokens — Norwegian", () => {
    it("'idag' yields start of current day", () => {
      const result = parseQueryIntent("idag", NOW);
      expect(result.targetDate).toBeDefined();
      expect(localDateStr(result.targetDate!)).toBe("2026-03-06");
    });

    it("'i dag' (two words) yields start of current day", () => {
      const result = parseQueryIntent("i dag", NOW);
      expect(result.targetDate).toBeDefined();
      expect(localDateStr(result.targetDate!)).toBe("2026-03-06");
    });

    it("'morgen' (standalone) yields next day", () => {
      const result = parseQueryIntent("morgen", NOW);
      expect(result.targetDate).toBeDefined();
      expect(localDateStr(result.targetDate!)).toBe("2026-03-07");
    });

    it("'i morgen' yields next day", () => {
      const result = parseQueryIntent("i morgen", NOW);
      expect(result.targetDate).toBeDefined();
      expect(localDateStr(result.targetDate!)).toBe("2026-03-07");
    });

    it("'Tromsø i morgen' strips date tokens, keeps location", () => {
      const result = parseQueryIntent("Tromsø i morgen", NOW);
      expect(result.locationQuery).toBe("Tromsø");
      expect(result.targetDate).toBeDefined();
      expect(localDateStr(result.targetDate!)).toBe("2026-03-07");
    });
  });

  describe("weekday resolution — English", () => {
    // NOW is Friday 2026-03-06. "friday" should target NEXT Friday (2026-03-13, delta=7).
    it("'friday' when today IS Friday targets next Friday", () => {
      const result = parseQueryIntent("friday", NOW);
      expect(result.targetDate?.getDay()).toBe(5);
      expect(localDateStr(result.targetDate!)).toBe("2026-03-13");
    });

    it("'monday' targets the coming Monday (2026-03-09)", () => {
      const result = parseQueryIntent("monday", NOW);
      expect(result.targetDate?.getDay()).toBe(1);
      expect(localDateStr(result.targetDate!)).toBe("2026-03-09");
    });

    it("'next friday' outside the forecast window does not set a target date", () => {
      const result = parseQueryIntent("next friday", NOW);
      expect(result.targetDate).toBeUndefined();
    });

    it("abbreviated: 'fri' resolves same as 'friday'", () => {
      const result = parseQueryIntent("fri", NOW);
      expect(result.targetDate?.getDay()).toBe(5);
    });
  });

  describe("weekday resolution — Norwegian (non-ø/å tokens)", () => {
    it("'fredag' targets next Friday (2026-03-13)", () => {
      const result = parseQueryIntent("fredag", NOW);
      expect(result.targetDate?.getDay()).toBe(5);
      expect(localDateStr(result.targetDate!)).toBe("2026-03-13");
    });

    it("'neste fredag' outside the forecast window does not set a target date", () => {
      const result = parseQueryIntent("neste fredag", NOW);
      expect(result.targetDate).toBeUndefined();
    });

    it("'mandag' resolves to Monday", () => {
      const result = parseQueryIntent("mandag", NOW);
      expect(result.targetDate?.getDay()).toBe(1);
    });

    it("'tirsdag' resolves to Tuesday", () => {
      const result = parseQueryIntent("tirsdag", NOW);
      expect(result.targetDate?.getDay()).toBe(2);
    });

    it("'onsdag' resolves to Wednesday", () => {
      const result = parseQueryIntent("onsdag", NOW);
      expect(result.targetDate?.getDay()).toBe(3);
    });

    it("'torsdag' resolves to Thursday", () => {
      const result = parseQueryIntent("torsdag", NOW);
      expect(result.targetDate?.getDay()).toBe(4);
    });

    // Note: 'søndag' and 'lørdag' do NOT work — ø/å are not decomposable in NFD
    // normalization (they lack separable combining marks), so stripDiacritics() leaves
    // them unchanged and they fail to match the lookup keys 'sondag'/'lordag'.
    // This is a known limitation of the current implementation.
  });

  describe("specific date — day + month", () => {
    it("'8 march' resolves when it is within the forecast window", () => {
      const result = parseQueryIntent("8 march", NOW);
      expect(localDateStr(result.targetDate!)).toBe("2026-03-08");
    });

    it("'15 april' does not set a target date outside the forecast window", () => {
      const result = parseQueryIntent("15 april", NOW);
      expect(result.targetDate).toBeUndefined();
    });

    it("combined: 'Oslo 8 march' strips date, keeps location", () => {
      const result = parseQueryIntent("Oslo 8 march", NOW);
      expect(result.locationQuery).toBe("Oslo");
      expect(localDateStr(result.targetDate!)).toBe("2026-03-08");
    });
  });

  describe("day-of-month only", () => {
    it("'10' (future this month within forecast window) resolves to 10th of current month", () => {
      const result = parseQueryIntent("10", NOW);
      expect(result.targetDate?.getDate()).toBe(10);
      expect(result.targetDate?.getMonth()).toBe(2); // March
    });

    it("'20' outside the forecast window does not set a target date", () => {
      const result = parseQueryIntent("20", NOW);
      expect(result.targetDate).toBeUndefined();
    });
  });
});
