import { useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Detail,
  Icon,
} from "@raycast/api";

const MONTHS = [
  "Jan.",
  "Feb.",
  "Mar.",
  "Apr.",
  "May",
  "June",
  "July",
  "Aug.",
  "Sept.",
  "Oct.",
  "Nov.",
  "Dec.",
];
const CROSSREF_WORKS_BASE_URL = "https://api.crossref.org/works";

// Extract DOI from:
// 1. 10.xxxx/xxxxx
// 2. https://doi.org/10.xxxx/xxxxx
// 3. https://www.science.org/doi/10.xxxx/xxxxx
// 4. https://dl.acm.org/doi/10.xxxx/xxxxx
const DOI_PATTERN = /10\.\d{4,9}\/[^\s"'<>]+/i;

interface CitationMetadata {
  author?: string;
  title?: string;
  siteName?: string;
  publishedDate?: string;
  url?: string;
  accessDate?: Date;
}

interface FormValues {
  url: string;
}

type MetadataSource = Partial<CitationMetadata> | null | undefined;

interface CrossrefAuthor {
  given?: string;
  family?: string;
  name?: string;
  literal?: string;
}

interface JsonLdAuthor {
  name?: string;
  givenName?: string;
  familyName?: string;
  literal?: string;
}

interface CitationDateParts {
  "date-parts"?: number[][];
  timestamp?: number;
}

interface CrossrefWork {
  author?: CrossrefAuthor[];
  title?: unknown;
  "container-title"?: unknown;
  publisher?: string | string[];
  published?: CitationDateParts;
  "published-print"?: CitationDateParts;
  "published-online"?: CitationDateParts;
  created?: CitationDateParts;
  DOI?: string;
}

interface CrossrefResponse {
  message?: CrossrefWork;
}

interface CslCitationData {
  author?: CrossrefAuthor[];
  title?: string | string[];
  "container-title"?: string | string[];
  publisher?: string | string[];
  issued?: CitationDateParts;
  published?: CitationDateParts;
  created?: CitationDateParts;
  DOI?: string;
}

interface JsonLdItem {
  "@type"?: string | string[];
  headline?: string | string[];
  name?: string | string[];
  publisher?: { name?: string | string[] };
  isPartOf?: { name?: string | string[] };
  author?: JsonLdAuthor | JsonLdAuthor[] | string | string[];
  datePublished?: string | string[];
  dateModified?: string | string[];
  uploadDate?: string | string[];
}

export default function ConvertUrlToMla() {
  const [input, setInput] = useState("");
  const [citation, setCitation] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConvert = async (values: FormValues) => {
    const rawInput = values.url;

    if (!rawInput.trim()) {
      showToast({ title: "Error", message: "Please enter a URL or DOI" });
      return;
    }

    setIsLoading(true);

    try {
      const result = await generateCitationForInput(rawInput);
      setCitation(result);
      showToast({ title: "Citation generated!" });
    } catch (error) {
      setCitation("");
      showToast({
        title: "Error",
        message:
          error instanceof Error
            ? error.message
            : "Could not generate citation",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (citation) {
    return (
      <Detail
        markdown={buildResultMarkdown(citation)}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Citation" content={citation} />
            <Action
              title="Convert Another"
              onAction={() => {
                setCitation("");
                setInput("");
              }}
              icon={Icon.ArrowLeft}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate Citation"
            onSubmit={handleConvert}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="MLA Citation Generator"
        text="Paste a URL or DOI. DOI inputs use DOI metadata only; invalid DOIs return an error instead of fake citations."
      />

      <Form.TextField
        id="url"
        title="Input"
        placeholder="https://example.com/article or 10.xxxx/xxxxx"
        value={input}
        onChange={setInput}
        autoFocus
      />
    </Form>
  );
}

/**
 * Main logic
 *
 * Important:
 * - If input contains DOI, use DOI metadata only.
 * - If DOI metadata fails, throw error.
 * - Never fallback to webpage scraping for DOI inputs.
 * - For webpage input, fetch with full URL, but output citation URL without http:// or https://.
 */
async function generateCitationForInput(rawInput: string): Promise<string> {
  const cleanedInput = cleanInput(rawInput);
  const doi = extractDoi(cleanedInput);

  if (doi) {
    const doiUrl = `https://doi.org/${doi}`;

    const [crossref, doiOrg] = await Promise.all([
      fetchCrossrefMetadata(doi),
      fetchDoiOrgMetadata(doi),
    ]);

    let metadata: CitationMetadata = {
      url: doiUrl,
      accessDate: new Date(),
    };

    metadata = mergeMetadataWithPriority(metadata, [crossref, doiOrg]);

    // Force canonical DOI URL.
    metadata.url = doiUrl;

    if (!hasUsefulDoiMetadata(metadata)) {
      throw new Error(
        `DOI metadata not found. Please check whether this DOI is correct: ${doi}`,
      );
    }

    return buildMlaCitation(metadata);
  }

  const normalizedUrl = normalizeUrl(cleanedInput);

  if (!isHttpUrl(normalizedUrl)) {
    throw new Error("Please enter a valid URL or DOI");
  }

  const cleanedUrl = cleanUrl(normalizedUrl);
  const web = await fetchWebMetadata(cleanedUrl);
  const host = hostnameFromUrl(cleanedUrl);

  const metadata: CitationMetadata = {
    url: cleanedUrl,
    accessDate: new Date(),
    siteName: cleanText(web.siteName) || host,
    title:
      cleanTitle(web.title || titleFromUrl(cleanedUrl)) || "[MISSING TITLE]",
    author: cleanText(web.author || "") || host,
    publishedDate: web.publishedDate,
  };

  return buildMlaCitation(metadata);
}

/**
 * MLA Citation Builder
 */
function buildMlaCitation(metadata: CitationMetadata): string {
  let author = formatAuthor(metadata.author || "");
  const title = cleanTitle(metadata.title || "") || "[MISSING TITLE]";
  const siteName = cleanText(metadata.siteName) || "[MISSING WEBSITE]";
  const publishedDate = formatPublicationDate(metadata.publishedDate);
  const url = formatUrlForCitation(metadata.url || "");
  const accessDate = formatAccessDate(metadata.accessDate || new Date());

  const normAuthor = normalizeForCompare(author);
  const normSite = normalizeForCompare(siteName);

  // MLA style: if author and website/container are the same, do not repeat author.
  if (normAuthor && normAuthor === normSite) {
    author = "";
  }

  const parts: string[] = [];

  if (author) {
    parts.push(withTerminalPunctuation(author));
  }

  parts.push(`"${withTerminalPunctuation(title)}"`);

  let container = `${siteName},`;

  if (publishedDate) {
    container += ` ${publishedDate},`;
  } else {
    container += ` [MISSING DATE],`;
  }

  if (url) {
    container += ` ${url}.`;
  }

  parts.push(container);
  parts.push(`Accessed ${accessDate}.`);

  return parts
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/\.\./g, ".")
    .replace(/,\s*\./g, ".")
    .trim();
}

function buildResultMarkdown(citation: string): string {
  return `# MLA Citation

\`\`\`
${citation}
\`\`\`

---

Press **Copy Citation** to copy it.`;
}

/**
 * DOI Metadata
 */
async function fetchCrossrefMetadata(
  doi: string,
): Promise<Partial<CitationMetadata> | null> {
  try {
    const response = await fetch(
      `${CROSSREF_WORKS_BASE_URL}/${encodeURIComponent(doi)}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) return null;

    const data = (await response.json()) as CrossrefResponse;
    const work = data?.message;

    if (!work) return null;

    return omitEmpty({
      author: crossrefAuthorsToText(work.author),
      title: firstArrayString(work.title),
      siteName:
        firstArrayString(work["container-title"]) ||
        firstString(work.publisher),
      publishedDate: datePartsToIso(
        work.published ||
          work["published-print"] ||
          work["published-online"] ||
          work.created,
      ),
      url: work.DOI ? `https://doi.org/${work.DOI}` : `https://doi.org/${doi}`,
    });
  } catch {
    return null;
  }
}

async function fetchDoiOrgMetadata(
  doi: string,
): Promise<Partial<CitationMetadata> | null> {
  try {
    const response = await fetch(`https://doi.org/${encodeURIComponent(doi)}`, {
      headers: {
        Accept: "application/vnd.citationstyles.csl+json",
      },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as CslCitationData;

    return omitEmpty({
      author: cslAuthorsToText(data.author),
      title: firstString(data.title),
      siteName:
        firstString(data["container-title"]) || firstString(data.publisher),
      publishedDate: datePartsToIso(
        data.issued || data.published || data.created,
      ),
      url: data.DOI ? `https://doi.org/${data.DOI}` : `https://doi.org/${doi}`,
    });
  } catch {
    return null;
  }
}

/**
 * Web Metadata
 */
async function fetchWebMetadata(
  url: string,
): Promise<Partial<CitationMetadata>> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) return {};

    const html = await response.text();
    const jsonLd = extractJsonLdMetadata(html);
    const metaTags = extractMetaTagMetadata(html);

    return omitEmpty({
      author: jsonLd.author || metaTags.author,
      title: jsonLd.title || metaTags.title || readTitle(html),
      siteName: jsonLd.siteName || metaTags.siteName || hostnameFromUrl(url),
      publishedDate: jsonLd.publishedDate || metaTags.publishedDate,
    });
  } catch {
    return {};
  }
}

function extractMetaTagMetadata(html: string): Partial<CitationMetadata> {
  return omitEmpty({
    title: readMeta(html, [
      "og:title",
      "twitter:title",
      "citation_title",
      "dc.title",
      "DC.title",
    ]),
    siteName: readMeta(html, [
      "og:site_name",
      "application-name",
      "twitter:site",
    ]),
    author: readMeta(html, [
      "author",
      "article:author",
      "citation_author",
      "dc.creator",
      "DC.creator",
      "twitter:creator",
    ]),
    publishedDate: readMeta(html, [
      "article:published_time",
      "article:modified_time",
      "citation_publication_date",
      "citation_online_date",
      "date",
      "pubdate",
      "dc.date",
      "DC.date",
    ]),
  });
}

function extractJsonLdMetadata(html: string): Partial<CitationMetadata> {
  const scriptRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  const results: Partial<CitationMetadata>[] = [];
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    const raw = decodeHtmlEntities(match[1].trim());

    try {
      const parsed = JSON.parse(raw);
      const items = flattenJsonLd(parsed);

      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const jsonLdItem = item as JsonLdItem;

        const type = Array.isArray(jsonLdItem["@type"])
          ? jsonLdItem["@type"].join(" ")
          : jsonLdItem["@type"] || "";

        const isUseful =
          /article|newsarticle|blogposting|scholarlyarticle|webpage|creativework|report/i.test(
            type,
          ) ||
          jsonLdItem.headline ||
          jsonLdItem.name;

        if (!isUseful) continue;

        results.push(
          omitEmpty({
            title: firstString(jsonLdItem.headline, jsonLdItem.name),
            siteName:
              firstString(jsonLdItem.publisher?.name) ||
              firstString(jsonLdItem.isPartOf?.name),
            author: jsonLdAuthorToText(jsonLdItem.author),
            publishedDate: firstString(
              jsonLdItem.datePublished,
              jsonLdItem.dateModified,
              jsonLdItem.uploadDate,
            ),
          }),
        );
      }
    } catch {
      continue;
    }
  }

  return mergeMetadataWithPriority({}, results);
}

function flattenJsonLd(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap(flattenJsonLd);
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if (Array.isArray(obj["@graph"])) {
      return [obj, ...(obj["@graph"] as unknown[]).flatMap(flattenJsonLd)];
    }

    return [obj];
  }

  return [];
}

/**
 * Author formatting
 */
function crossrefAuthorsToText(authors: CrossrefAuthor[] | undefined): string {
  if (!Array.isArray(authors)) return "";

  return authors
    .map((author) => {
      const given = cleanText(author.given || "");
      const family = cleanText(author.family || "");
      const literal = cleanText(author.name || "");

      if (given && family) return `${given} ${family}`;
      if (family) return family;
      if (literal) return literal;
      return "";
    })
    .filter(Boolean)
    .join(" and ");
}

function cslAuthorsToText(authors: CrossrefAuthor[] | undefined): string {
  if (!Array.isArray(authors)) return "";

  return authors
    .map((author) => {
      const given = cleanText(author.given || "");
      const family = cleanText(author.family || "");
      const literal = cleanText(author.literal || author.name || "");

      if (given && family) return `${given} ${family}`;
      if (family) return family;
      if (literal) return literal;
      return "";
    })
    .filter(Boolean)
    .join(" and ");
}

function jsonLdAuthorToText(
  author: JsonLdAuthor | JsonLdAuthor[] | string | string[] | undefined,
): string {
  if (!author) return "";

  if (typeof author === "string") {
    return cleanText(author);
  }

  if (Array.isArray(author)) {
    return author
      .map((a) => {
        if (typeof a === "string") return cleanText(a);
        return cleanText(a?.name || "");
      })
      .filter(Boolean)
      .join(" and ");
  }

  if (typeof author === "object") {
    return cleanText(author.name || "");
  }

  return "";
}

function formatAuthor(author: string): string {
  const cleaned = cleanPersonName(author);
  if (!cleaned) return "";

  if (looksLikeOrganization(cleaned)) {
    return cleaned;
  }

  const authors = cleaned
    .split(/\s+(?:and|&)\s+/i)
    .map(cleanPersonName)
    .filter(Boolean);

  if (authors.length >= 3) {
    return `${invertPersonalName(authors[0])}, et al.`;
  }

  if (authors.length === 2) {
    return `${invertPersonalName(authors[0])}, and ${authors[1]}`;
  }

  return invertPersonalName(cleaned);
}

function invertPersonalName(name: string): string {
  const cleaned = cleanPersonName(name);

  if (!cleaned) return "";
  if (cleaned.includes(",")) return cleaned;
  if (looksLikeOrganization(cleaned)) return cleaned;

  const parts = cleaned.split(/\s+/).filter(Boolean);

  if (parts.length < 2) return cleaned;

  const last = parts.pop();
  return `${last}, ${parts.join(" ")}`;
}

function looksLikeOrganization(name: string): boolean {
  const cleaned = cleanText(name);
  if (!cleaned) return false;

  return /\b(University|Institute|Organization|Organisation|Association|Society|Foundation|Committee|Commission|Department|Agency|Ministry|Office|Bureau|Council|Center|Centre|Corporation|Company|Inc|LLC|Ltd|Press|World Bank|United Nations|World Health Organization|International Monetary Fund|Mozilla|Python Software Foundation)\b/i.test(
    cleaned,
  );
}

/**
 * Date formatting
 */
function formatPublicationDate(dateValue: string | undefined): string {
  const cleaned = cleanText(dateValue || "");
  if (!cleaned) return "";

  // Only year should stay as year.
  // Do not turn "2024" into "1 Jan. 2024".
  if (/^(19|20)\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  const date = parseDateFlexible(cleaned);

  if (!date) {
    return cleaned;
  }

  return formatAccessDate(date);
}

function formatAccessDate(date: Date): string {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function parseDateFlexible(value: string): Date | null {
  const cleaned = cleanText(value);

  if (!cleaned) return null;

  const ymd = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) {
    return new Date(
      Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])),
    );
  }

  const timestamp = Date.parse(cleaned);
  if (!Number.isNaN(timestamp)) {
    return new Date(timestamp);
  }

  return null;
}

function datePartsToIso(dateObj: CitationDateParts | null | undefined): string {
  if (!dateObj) return "";

  const parts = dateObj["date-parts"]?.[0];

  if (Array.isArray(parts)) {
    const [year, month, day] = parts;

    if (!year) return "";

    if (!month) {
      return String(year);
    }

    if (!day) {
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
    }

    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  if (dateObj.timestamp) {
    return new Date(dateObj.timestamp).toISOString().slice(0, 10);
  }

  return "";
}

/**
 * URL / DOI helpers
 */
function extractDoi(input: string): string {
  const cleaned = cleanInput(input);
  const match = cleaned.match(DOI_PATTERN);

  if (!match) return "";

  return normalizeDoi(match[0]);
}

function normalizeDoi(doi: string): string {
  return doi
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/[)\].,;:!?]+$/g, "")
    .replace(/&.*$/g, "")
    .toLowerCase()
    .trim();
}

function normalizeUrl(input: string): string {
  const cleaned = cleanInput(input);

  if (isHttpUrl(cleaned)) {
    return cleaned;
  }

  if (looksLikeBareDomain(cleaned)) {
    return `https://${cleaned}`;
  }

  return cleaned;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function looksLikeBareDomain(value: string): boolean {
  const cleaned = cleanInput(value);

  if (!cleaned) return false;
  if (cleaned.includes("@")) return false;
  if (cleaned.includes(" ")) return false;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(cleaned)) return false;

  return /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(cleaned);
}

function cleanUrl(url: string | undefined): string {
  const raw = cleanInput(url || "");

  if (!raw) return "";

  try {
    const parsed = new URL(raw);

    // Remove fragment.
    parsed.hash = "";

    // Remove tracking params.
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "utm_id",
      "gclid",
      "fbclid",
      "mc_cid",
      "mc_eid",
    ];

    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }

    return parsed.toString().replace(/\/$/, "");
  } catch {
    return raw.replace(/\/$/, "");
  }
}

function formatUrlForCitation(url: string | undefined): string {
  const cleaned = cleanUrl(url || "");

  return cleaned
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}

function hostnameFromUrl(url: string | undefined): string {
  try {
    return new URL(url || "").hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/$/, "");
    const last = pathname.split("/").filter(Boolean).pop();

    if (!last) {
      return hostnameFromUrl(url);
    }

    return decodeURIComponent(last)
      .replace(/\.(html?|php|aspx?)$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  } catch {
    return "";
  }
}

/**
 * HTML helpers
 */
function readMeta(html: string, names: string[]): string {
  for (const name of names) {
    const escaped = escapeRegex(name);

    const patterns = [
      new RegExp(
        `<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,
        "i",
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`,
        "i",
      ),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        return cleanText(decodeHtmlEntities(match[1]));
      }
    }
  }

  return "";
}

function readTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanTitle(decodeHtmlEntities(match[1])) : "";
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

/**
 * General helpers
 */
function cleanInput(input: string): string {
  return cleanText(input).replace(/[)\].,;:!?]+$/g, "");
}

function cleanText(value: string | undefined | null): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

function cleanTitle(title: string): string {
  let cleaned = cleanText(title);

  if (!cleaned) return "";

  // Remove common SEO suffixes:
  // "JavaScript | MDN" -> "JavaScript"
  // "Learn React – React" -> "Learn React"
  cleaned = cleaned.split(/\s+[|–—]\s+/)[0].trim();

  return cleaned.replace(/\s+/g, " ");
}

function cleanPersonName(name: string): string {
  return cleanText(name)
    .replace(/^by\s+/i, "")
    .replace(/\s*,?\s*(PhD|MD|M\.D\.|Dr\.|Professor)$/i, "")
    .trim();
}

function withTerminalPunctuation(value: string): string {
  const cleaned = cleanText(value);
  if (!cleaned) return "";
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

function normalizeForCompare(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/^the\s+/i, "")
    .replace(/[^a-z0-9]/g, "");
}

function hasUsefulDoiMetadata(metadata: Partial<CitationMetadata>): boolean {
  return Boolean(
    cleanText(metadata.title || "") &&
    cleanText(metadata.siteName || metadata.author || ""),
  );
}

function mergeMetadataWithPriority(
  base: Partial<CitationMetadata>,
  sources: MetadataSource[],
): CitationMetadata {
  const result: CitationMetadata = { ...base };

  for (const source of sources) {
    if (!source) continue;

    for (const [key, value] of Object.entries(source)) {
      if (value === undefined || value === null || value === "") continue;

      if (!result[key as keyof CitationMetadata]) {
        (result as Record<string, unknown>)[key] = value;
      }
    }
  }

  return result;
}

function omitEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && !cleanText(value)) continue;

    (result as Record<string, unknown>)[key] = value;
  }

  return result;
}

function firstArrayString(value: unknown): string {
  if (Array.isArray(value)) {
    return cleanText(
      (value as string[]).find(
        (item) => typeof item === "string" && cleanText(item),
      ) || "",
    );
  }

  if (typeof value === "string") {
    return cleanText(value);
  }

  return "";
}

function firstString(
  ...values: (string | string[] | null | undefined)[]
): string {
  for (const value of values) {
    if (typeof value === "string" && cleanText(value)) {
      return cleanText(value);
    }

    if (Array.isArray(value)) {
      const found = firstArrayString(value);
      if (found) return found;
    }
  }

  return "";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
