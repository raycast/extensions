/**
 * The portal's link contracts, mirrored.
 *
 * These build the same URLs as `buildImportLink`
 * (`src/features/claim-intake/import-link.ts`) in the portal repo. They are
 * duplicated rather than imported because a Raycast extension is a separate
 * package that ships to a laptop - but the *shape* is the contract, and
 * `docs/claim-import-link.md` is where it is written down. If a portal
 * catch-up key changes, it changes here too.
 *
 * There is no API key anywhere in this extension, on purpose. It only opens a
 * URL in the admin's own browser, so the portal's session cookie is what
 * authorizes the work - nothing to leak, nothing to rotate, and the portal's
 * audit log names the actual person rather than an integration.
 */

/** Claim stages this extension targets. Mirrors `CLAIM_STAGE_ORDER`. */
export type ClaimStage =
  | "professional_recommendation_uploaded"
  | "distributor_invited"
  | "waiting_for_md_review"
  | "approved";

export type DocumentKind = "prescription" | "recommendation";

/** Which route a document implies. A Rezept is Weg B, a Empfehlung is Weg A. */
const ROUTE_FOR: Record<DocumentKind, string> = {
  prescription: "prescription",
  recommendation: "care_consultation",
};

const OTHER: Record<DocumentKind, DocumentKind> = {
  prescription: "recommendation",
  recommendation: "prescription",
};

export const DOCUMENT_LABEL: Record<DocumentKind, string> = {
  prescription: "Rezept",
  recommendation: "Empfehlung der Pflegeberatung (§ 37.3)",
};

/** A `YYYY-MM-DD` day in local time - not `toISOString`, which shifts in UTC-. */
export function toIsoDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * What is wrong with a date, if anything - the message for the form field.
 *
 * A future day is refused rather than sent: nothing already in our hands
 * happened tomorrow, and the portal would reject it anyway
 * (`parseReceivedOn`), silently falling back to "now".
 *
 * `now` is a parameter so this is testable without freezing the clock, and so
 * a form left open past midnight is judged at the moment of submission.
 */
export function dateError(
  date: Date | null,
  now: Date = new Date(),
): string | undefined {
  if (!date) return "Datum angeben.";
  if (toIsoDay(date) > toIsoDay(now)) return "Das Datum liegt in der Zukunft.";
  return undefined;
}

/** Trim a trailing slash so joining a path never doubles it. */
export function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

/**
 * Hosts where plain http is safe, because the traffic never leaves the machine.
 *
 * The same set browsers treat as a secure context (W3C "potentially trustworthy
 * origin"), which is why `http://localhost` gets Service Workers and WebCrypto
 * while `http://example.com` does not. Matching it here rather than inventing a
 * looser rule keeps the exception exactly as wide as the platform's own.
 *
 * `localhost.evil.com` deliberately does not match: the suffix check requires a
 * dot-separated `.localhost` label (RFC 6761 reserves that TLD for loopback),
 * not a name that merely starts with the word.
 */
function isLoopbackHost(hostname: string): boolean {
  // The URL parser has already lowercased the host and expanded IPv4
  // shorthand (`127.1` → `127.0.0.1`), so canonical forms are enough.
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;
  if (hostname === "[::1]") return true;
  return /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname);
}

/**
 * Reject anything but an https origin - or a loopback http one, for development.
 *
 * The URL carries a Kontaktperson's name or email, so a typo'd host would send
 * personal data somewhere else in clear text. That is the whole reason for the
 * rule, and it is exactly why loopback is exempt: nothing is on the wire to
 * intercept. Any other http host is refused, mistake or not.
 */
export function validateOrigin(raw: string): string | null {
  const value = normalizeOrigin(raw);
  if (!value)
    return "Portal URL fehlt - in den Extension-Einstellungen setzen.";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Portal URL ist keine gültige URL.";
  }
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && isLoopbackHost(url.hostname))
  ) {
    return "Portal URL muss https sein - http nur für localhost / 127.0.0.1.";
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    return "Portal URL darf nur den Host enthalten, ohne Pfad.";
  }
  return null;
}

/** One thing the link asks the portal to do, for the summary panel. */
export interface PlannedChange {
  label: string;
  value: string;
}

export interface DocumentReport {
  origin: string;
  locale: string;
  /** Name or email of the Kontaktperson - the portal resolves it. */
  query: string;
  document: DocumentKind;
  /** When it actually arrived, `YYYY-MM-DD`. */
  receivedOn: string;
}

/**
 * The link for "this document arrived".
 *
 * Answers everything the skip-ahead to `professional_recommendation_uploaded`
 * asks, so the portal completes without showing a question:
 *
 * - the route, which the document type states (a Rezept means Weg B);
 * - this document as received, on the given date;
 * - the *other* document as not applicable, since the route rules it out.
 *
 * All three are observations, not guesses - somebody read the email. That
 * distinction is what `docs/adr/0001` cares about: a value nobody looked at
 * would be the forbidden silent default.
 */
export function buildDocumentReportUrl(input: DocumentReport): string {
  const search = new URLSearchParams();
  search.set("q", input.query.trim());
  search.set("stage", "professional_recommendation_uploaded");
  search.set("a.routed.claim_route", ROUTE_FOR[input.document]);
  search.set(`a.document.${input.document}`, "received");
  search.set(`a.document.${input.document}.date`, input.receivedOn);
  search.set(`a.document.${OTHER[input.document]}`, "not_applicable");
  return `${normalizeOrigin(input.origin)}/${input.locale}/admin/claims/import?${search}`;
}

/** What the document link will ask the portal to do, in reading order. */
export function describeDocumentReport(input: DocumentReport): PlannedChange[] {
  return [
    { label: "Kontaktperson", value: input.query.trim() },
    { label: "Antrag", value: "wird angelegt, falls noch keiner existiert" },
    {
      label: "Weg",
      value:
        input.document === "prescription"
          ? "Weg B – Rezept"
          : "Weg A – Pflegeberatung",
    },
    {
      label: DOCUMENT_LABEL[input.document],
      value: `erhalten am ${input.receivedOn}`,
    },
    {
      label: DOCUMENT_LABEL[OTHER[input.document]],
      value: "nicht zutreffend (anderer Weg)",
    },
    { label: "Antragsphase", value: "Empfehlung / Rezept liegt vor" },
  ];
}

export interface MdReport {
  origin: string;
  locale: string;
  query: string;
  /**
   * Let the portal ask which Medizinischer Dienst, instead of taking the
   * generic one.
   *
   * The extension cannot offer that choice itself - the field's options are
   * HubSpot company ids, which it has no way to read. So it forwards the
   * decision: off means "the generic MD is fine", on means "stop and let me
   * pick in the portal".
   */
  chooseMd: boolean;
}

/**
 * The link for "the Medizinischer Dienst is now involved".
 *
 * Sends no answer for `waiting_for_md_review.md`. That is deliberate rather
 * than a gap: the field declares the generic MD as its `defaultValue`, which
 * the portal treats as the honest fallback when the regional MD is not known
 * yet - so leaving it unanswered completes silently with the generic company,
 * and `ask=1` is how you opt into naming a specific one.
 */
export function buildMdReportUrl(input: MdReport): string {
  const search = new URLSearchParams();
  search.set("q", input.query.trim());
  search.set("stage", "waiting_for_md_review");
  if (input.chooseMd) search.set("ask", "1");
  return `${normalizeOrigin(input.origin)}/${input.locale}/admin/claims/import?${search}`;
}

/** What the MD link will ask the portal to do, in reading order. */
export function describeMdReport(input: MdReport): PlannedChange[] {
  return [
    { label: "Kontaktperson", value: input.query.trim() },
    { label: "Antragsphase", value: "Wartet auf MD-Begutachtung" },
    {
      label: "Medizinischer Dienst",
      value: input.chooseMd
        ? "im Portal auswählen"
        : "Standard-MD wird hinterlegt",
    },
  ];
}

export interface HandoverReport {
  origin: string;
  locale: string;
  query: string;
  /** The day the claim went to the Versorgungspartner, `YYYY-MM-DD`. */
  handedOverOn: string;
}

/**
 * The link for "the Antrag has gone to the Versorgungspartner".
 *
 * Sets the Antragsphase to `distributor_invited` ("An Versorgungspartner
 * übergeben") and answers that stage's date catch-up with the day the handover
 * actually happened - the mail to the partner is sent by hand, so it is
 * regularly recorded the morning after.
 *
 * The date lands on the claim's `handoff_completed_at`, which the portal only
 * writes here when it is still empty. Two consequences worth knowing: an
 * acceptance date already on the claim is never overwritten, and once the
 * partner accepts, the handoff page stamps the acceptance day over this one -
 * that event owns the property.
 *
 * Sends no Antrags-Versorger. The portal's soft ask for it is optional, so the
 * link commits without one; who the partner is comes from the deal card (or
 * the Kontaktperson's own selection), not from an assumption made here.
 */
export function buildHandoverReportUrl(input: HandoverReport): string {
  const search = new URLSearchParams();
  search.set("q", input.query.trim());
  search.set("stage", "distributor_invited");
  search.set("a.distributor_invited.handoff_at", input.handedOverOn);
  return `${normalizeOrigin(input.origin)}/${input.locale}/admin/claims/import?${search}`;
}

/** What the handover link will ask the portal to do, in reading order. */
export function describeHandoverReport(input: HandoverReport): PlannedChange[] {
  return [
    { label: "Kontaktperson", value: input.query.trim() },
    { label: "Antrag", value: "wird angelegt, falls noch keiner existiert" },
    { label: "Übergabe am", value: input.handedOverOn },
    { label: "Antragsphase", value: "An Versorgungspartner übergeben" },
  ];
}

export interface ApprovalReport {
  origin: string;
  locale: string;
  query: string;
}

/**
 * The link for "die Pflegekasse hat bewilligt".
 *
 * Sets the Antragsphase to `approved` and answers nothing else. That is the
 * whole command: an approval is an *outcome*, and the only thing the person
 * reading the letter actually knows.
 *
 * In particular it sends no document answers. A claim that reaches a decision
 * without the Rezept or Pflegeempfehlung ever being ticked off in the portal
 * has a gap in its record - and inventing "received" here to close that gap
 * would be a value nobody looked at, which is exactly the silent default
 * `docs/adr/0001` forbids. If the portal wants those fields it will ask, on
 * screen, where somebody can answer them honestly or leave them alone.
 *
 * There is no date either: the stage has no catch-up field to put one in
 * (`claim-stage-catchup.ts` defines none for `approved`), so a picker here
 * would collect a day the portal has nowhere to write.
 */
export function buildApprovalReportUrl(input: ApprovalReport): string {
  const search = new URLSearchParams();
  search.set("q", input.query.trim());
  search.set("stage", "approved");
  return `${normalizeOrigin(input.origin)}/${input.locale}/admin/claims/import?${search}`;
}

/** What the approval link will ask the portal to do, in reading order. */
export function describeApprovalReport(input: ApprovalReport): PlannedChange[] {
  return [
    { label: "Kontaktperson", value: input.query.trim() },
    { label: "Antrag", value: "wird angelegt, falls noch keiner existiert" },
    { label: "Antragsphase", value: "Bewilligt" },
    {
      label: "Dokumente",
      value: "unverändert - das Portal fragt, falls noch etwas fehlt",
    },
  ];
}
