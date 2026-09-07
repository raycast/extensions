import { describe, expect, it } from "vitest";
import {
  buildDocumentReportUrl,
  buildHandoverReportUrl,
  buildMdReportUrl,
  buildApprovalReportUrl,
  dateError,
  describeDocumentReport,
  describeHandoverReport,
  describeMdReport,
  describeApprovalReport,
  normalizeOrigin,
  toIsoDay,
  validateOrigin,
} from "./portal";

const ORIGIN = "https://portal.inclusys.de";

/** The query string of a built URL, as a plain object. */
function params(url: string): Record<string, string> {
  return Object.fromEntries(new URL(url).searchParams);
}

describe("toIsoDay", () => {
  it("formats in local time, not UTC", () => {
    // `toISOString()` would report the previous day for a late-evening date in
    // a UTC- zone, which would backdate the Rezept by one day.
    expect(toIsoDay(new Date(2026, 7, 10, 23, 30))).toBe("2026-08-10");
    expect(toIsoDay(new Date(2026, 7, 10, 0, 15))).toBe("2026-08-10");
  });

  it("pads single-digit months and days", () => {
    expect(toIsoDay(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("dateError", () => {
  const now = new Date(2026, 4, 15);

  it("asks for a day when the picker was cleared", () => {
    expect(dateError(null, now)).toBe("Datum angeben.");
  });

  it("accepts today and any day before it", () => {
    expect(dateError(new Date(2026, 4, 15), now)).toBeUndefined();
    expect(dateError(new Date(2026, 4, 14), now)).toBeUndefined();
    expect(dateError(new Date(2019, 0, 1), now)).toBeUndefined();
  });

  // Nothing already in our hands happened tomorrow, and the portal would drop
  // it anyway and silently record "now" instead.
  it("refuses a future day", () => {
    expect(dateError(new Date(2026, 4, 16), now)).toBe(
      "Das Datum liegt in der Zukunft.",
    );
  });
});

describe("normalizeOrigin", () => {
  it.each([
    ["https://portal.inclusys.de", "https://portal.inclusys.de"],
    ["https://portal.inclusys.de/", "https://portal.inclusys.de"],
    ["https://portal.inclusys.de///", "https://portal.inclusys.de"],
    ["  https://portal.inclusys.de  ", "https://portal.inclusys.de"],
  ])("normalizes %s", (raw, expected) => {
    expect(normalizeOrigin(raw)).toBe(expected);
  });
});

describe("validateOrigin", () => {
  it("accepts a bare https origin", () => {
    expect(validateOrigin(ORIGIN)).toBeNull();
    expect(validateOrigin(`${ORIGIN}/`)).toBeNull();
  });

  it.each([
    ["localhost", "http://localhost:3000"],
    ["localhost with no port", "http://localhost"],
    ["an uppercase host", "http://LOCALHOST:3000"],
    ["127.0.0.1", "http://127.0.0.1:3000"],
    ["IPv4 shorthand, which the parser expands", "http://127.1:3000"],
    ["another 127/8 address", "http://127.0.0.2:3000"],
    ["IPv6 loopback", "http://[::1]:3000"],
    ["a .localhost subdomain", "http://app.localhost:3000"],
    ["https on localhost", "https://localhost:3000"],
  ])(
    "accepts http on %s - nothing is on the wire to intercept",
    (_label, raw) => {
      expect(validateOrigin(raw)).toBeNull();
    },
  );

  it.each([
    ["empty", ""],
    ["whitespace", "   "],
    ["not a URL", "portal.inclusys.de"],
    ["http on a real host", "http://portal.inclusys.de"],
    ["a host that merely starts with localhost", "http://localhost.evil.com"],
    ["a host that merely contains 127.0.0.1", "http://127.0.0.1.evil.com"],
    ["0.0.0.0, which is not loopback", "http://0.0.0.0:3000"],
    ["a LAN address", "http://192.168.1.5:3000"],
    ["a path", "https://portal.inclusys.de/de/admin"],
  ])("rejects %s", (_label, raw) => {
    // The URL carries a Kontaktperson's name or email, so a wrong host would
    // send personal data somewhere else in clear text.
    expect(validateOrigin(raw)).toBeTruthy();
  });

  it("still rejects a path on a localhost origin", () => {
    expect(validateOrigin("http://localhost:3000/de/admin")).toBeTruthy();
  });
});

describe("buildDocumentReportUrl", () => {
  const base = { origin: ORIGIN, locale: "de", query: "hannelore@example.de" };

  it("answers every catch-up the prescription skip asks", () => {
    const url = buildDocumentReportUrl({
      ...base,
      document: "prescription",
      receivedOn: "2026-08-10",
    });

    expect(new URL(url).pathname).toBe("/de/admin/claims/import");
    expect(params(url)).toEqual({
      q: "hannelore@example.de",
      stage: "professional_recommendation_uploaded",
      "a.routed.claim_route": "prescription",
      "a.document.prescription": "received",
      "a.document.prescription.date": "2026-08-10",
      // The route rules the other document out, so the portal need not ask.
      "a.document.recommendation": "not_applicable",
    });
  });

  it("mirrors the fields for a Pflegeempfehlung", () => {
    const url = buildDocumentReportUrl({
      ...base,
      document: "recommendation",
      receivedOn: "2026-08-10",
    });

    expect(params(url)).toMatchObject({
      "a.routed.claim_route": "care_consultation",
      "a.document.recommendation": "received",
      "a.document.recommendation.date": "2026-08-10",
      "a.document.prescription": "not_applicable",
    });
  });

  it("trims the query and encodes it", () => {
    const url = buildDocumentReportUrl({
      ...base,
      query: "  Anna von Meyer  ",
      document: "prescription",
      receivedOn: "2026-08-10",
    });
    expect(params(url).q).toBe("Anna von Meyer");
    expect(url).toContain("Anna+von+Meyer");
  });

  it("does not double the slash after a trailing-slash origin", () => {
    const url = buildDocumentReportUrl({
      ...base,
      origin: `${ORIGIN}/`,
      document: "prescription",
      receivedOn: "2026-08-10",
    });
    expect(url).toContain("de/admin/claims/import");
    expect(url).not.toContain("//de/");
  });

  it("honours the locale preference", () => {
    const url = buildDocumentReportUrl({
      ...base,
      locale: "en",
      document: "prescription",
      receivedOn: "2026-08-10",
    });
    expect(new URL(url).pathname).toBe("/en/admin/claims/import");
  });
});

describe("describeDocumentReport", () => {
  it("names the route and both documents, so the panel matches the link", () => {
    const changes = describeDocumentReport({
      origin: ORIGIN,
      locale: "de",
      query: "hannelore@example.de",
      document: "prescription",
      receivedOn: "2026-08-10",
    });
    const flat = changes
      .map((c: { label: string; value: string }) => `${c.label}: ${c.value}`)
      .join("\n");

    expect(flat).toContain("Weg: Weg B");
    expect(flat).toContain("erhalten am 2026-08-10");
    expect(flat).toContain("nicht zutreffend");
  });
});

describe("buildMdReportUrl", () => {
  const base = { origin: ORIGIN, locale: "de", query: "hannelore@example.de" };

  it("targets the MD stage and answers nothing else", () => {
    const url = buildMdReportUrl({ ...base, chooseMd: false });

    expect(new URL(url).pathname).toBe("/de/admin/claims/import");
    // No `a.waiting_for_md_review.md`: the field's own defaultValue is the
    // generic MD, which the portal treats as the honest fallback. Sending a
    // company id the extension cannot read would be a guess.
    expect(params(url)).toEqual({
      q: "hannelore@example.de",
      stage: "waiting_for_md_review",
    });
  });

  it("sets ask=1 when the MD should be picked in the portal", () => {
    const url = buildMdReportUrl({ ...base, chooseMd: true });
    expect(params(url)).toMatchObject({ ask: "1" });
  });

  it("trims the query", () => {
    const url = buildMdReportUrl({
      ...base,
      query: "  Anna von Meyer  ",
      chooseMd: false,
    });
    expect(params(url).q).toBe("Anna von Meyer");
  });

  it("honours the locale and a trailing-slash origin", () => {
    const url = buildMdReportUrl({
      ...base,
      origin: `${ORIGIN}/`,
      locale: "en",
      chooseMd: false,
    });
    expect(new URL(url).pathname).toBe("/en/admin/claims/import");
  });
});

describe("describeMdReport", () => {
  it("says which MD will be used", () => {
    const flat = (chooseMd: boolean) =>
      describeMdReport({
        origin: ORIGIN,
        locale: "de",
        query: "x@y.de",
        chooseMd,
      })
        .map((c: { label: string; value: string }) => `${c.label}: ${c.value}`)
        .join("\n");

    expect(flat(false)).toContain("Standard-MD wird hinterlegt");
    expect(flat(true)).toContain("im Portal auswählen");
    expect(flat(false)).toContain("Antragsphase: Wartet auf MD-Begutachtung");
  });
});

describe("buildHandoverReportUrl", () => {
  const base = { origin: ORIGIN, locale: "de", query: "hannelore@example.de" };

  it("targets the handover stage and answers its date catch-up", () => {
    const url = buildHandoverReportUrl({ ...base, handedOverOn: "2026-08-09" });

    expect(new URL(url).pathname).toBe("/de/admin/claims/import");
    expect(params(url)).toEqual({
      q: "hannelore@example.de",
      stage: "distributor_invited",
      // The portal writes this to `handoff_completed_at`, and only while that
      // property is still empty - an acceptance date is never overwritten.
      "a.distributor_invited.handoff_at": "2026-08-09",
    });
  });

  it("sends no Antrags-Versorger - the portal's ask for it is optional", () => {
    const url = buildHandoverReportUrl({ ...base, handedOverOn: "2026-08-09" });
    expect(
      params(url)["a.distributor_invited.antragsversorger"],
    ).toBeUndefined();
  });

  it("trims the query, honours the locale and a trailing-slash origin", () => {
    const url = buildHandoverReportUrl({
      ...base,
      origin: `${ORIGIN}/`,
      locale: "en",
      query: "  Anna von Meyer  ",
      handedOverOn: "2026-08-09",
    });

    expect(new URL(url).pathname).toBe("/en/admin/claims/import");
    expect(url).not.toContain("//en/");
    expect(params(url).q).toBe("Anna von Meyer");
  });
});

describe("describeHandoverReport", () => {
  it("names the day and the stage the link asks for", () => {
    const flat = describeHandoverReport({
      origin: ORIGIN,
      locale: "de",
      query: "x@y.de",
      handedOverOn: "2026-08-09",
    })
      .map((c: { label: string; value: string }) => `${c.label}: ${c.value}`)
      .join("\n");

    expect(flat).toContain("Übergabe am: 2026-08-09");
    expect(flat).toContain("Antragsphase: An Versorgungspartner übergeben");
  });
});

describe("buildApprovalReportUrl", () => {
  const base = { origin: ORIGIN, locale: "de", query: "Maria Bauer" };

  it("sets the approved stage and answers nothing else", () => {
    const url = buildApprovalReportUrl(base);
    expect(new URL(url).pathname).toBe("/de/admin/claims/import");
    expect(params(url)).toEqual({ q: "Maria Bauer", stage: "approved" });
  });

  // The point of "ignore docs received": a decision letter says nothing about
  // whether the Rezept was ever filed, so the link must not claim it was.
  it("sends no document or route answers", () => {
    const keys = Object.keys(params(buildApprovalReportUrl(base)));
    expect(keys.filter((k) => k.startsWith("a."))).toEqual([]);
  });

  it("trims the query and honours locale and a trailing-slash origin", () => {
    const url = buildApprovalReportUrl({
      ...base,
      origin: `${ORIGIN}/`,
      locale: "en",
      query: "  maria@example.com  ",
    });
    expect(url).toBe(
      `${ORIGIN}/en/admin/claims/import?q=maria%40example.com&stage=approved`,
    );
  });
});

describe("describeApprovalReport", () => {
  it("says the stage is set and the documents are left alone", () => {
    const changes = describeApprovalReport({
      origin: ORIGIN,
      locale: "de",
      query: "Maria Bauer",
    });
    expect(changes).toEqual([
      { label: "Kontaktperson", value: "Maria Bauer" },
      { label: "Antrag", value: "wird angelegt, falls noch keiner existiert" },
      { label: "Antragsphase", value: "Bewilligt" },
      {
        label: "Dokumente",
        value: "unverändert - das Portal fragt, falls noch etwas fehlt",
      },
    ]);
  });
});
