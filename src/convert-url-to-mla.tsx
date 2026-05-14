import { useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Detail,
  Icon,
  Color,
  Toast,
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

interface CitationResult {
  citation: string;
  citationHtml: string;
  citationMarkdown: string;
  metadata: CitationMetadata;
  sourceType: "DOI" | "Web Page";
  sourceLabel: string;
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
  const [result, setResult] = useState<CitationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputKind = describeInputKind(input);

  const handleConvert = async (values: FormValues) => {
    const rawInput = values.url;

    if (!rawInput.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Input Required",
        message: "Please enter a URL or DOI",
      });
      return;
    }

    setIsLoading(true);

    try {
      const nextResult = await generateCitationForInput(rawInput);
      setResult(nextResult);
      showToast({
        style: Toast.Style.Success,
        title: "Citation Generated",
        message: `${nextResult.sourceType} metadata formatted as MLA`,
      });
    } catch (error) {
      setResult(null);
      showToast({
        style: Toast.Style.Failure,
        title: "Could Not Generate Citation",
        message:
          error instanceof Error
            ? error.message
            : "Could not generate citation",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (result) {
    return (
      <Detail
        markdown={buildResultMarkdown(result)}
        metadata={buildResultMetadata(result)}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Citation">
              <Action.CopyToClipboard
                title="Copy Citation"
                content={{
                  html: result.citationHtml,
                  text: result.citation,
                }}
                icon={{ source: Icon.Clipboard, tintColor: Color.Green }}
              />
              <Action.Paste
                title="Paste Citation"
                content={{
                  html: result.citationHtml,
                  text: result.citation,
                }}
                icon={{ source: Icon.TextCursor, tintColor: Color.Blue }}
              />
              <Action.CopyToClipboard
                title="Copy as Plain Text"
                content={result.citation}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                icon={{ source: Icon.Text, tintColor: Color.SecondaryText }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              {result.metadata.url ? (
                <Action.OpenInBrowser
                  title="Open Source"
                  url={result.metadata.url}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  icon={{ source: Icon.Globe, tintColor: Color.Purple }}
                />
              ) : null}
              <Action
                title="New Citation"
                onAction={() => {
                  setResult(null);
                  setInput("");
                }}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                icon={{
                  source: Icon.ArrowCounterClockwise,
                  tintColor: Color.Orange,
                }}
              />
            </ActionPanel.Section>
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
            icon={{ source: Icon.Wand, tintColor: Color.Purple }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="QuickCite"
        text="Paste a URL or DOI to generate an MLA 9th edition citation with proper formatting."
      />

      <Form.TextField
        id="url"
        title="URL or DOI"
        placeholder="Paste a link or DOI..."
        info="Accepts full URLs, bare domains, DOI URLs (doi.org/...), or bare DOIs (10.xxxx/...)."
        value={input}
        onChange={setInput}
        autoFocus
      />

      <Form.Separator />

      <Form.Description title={inputKind.title} text={inputKind.text} />
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
async function generateCitationForInput(
  rawInput: string,
): Promise<CitationResult> {
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

    const doiCitation = buildMlaCitation(metadata);
    return {
      citation: doiCitation.text,
      citationHtml: doiCitation.html,
      citationMarkdown: doiCitation.markdown,
      metadata,
      sourceType: "DOI",
      sourceLabel: doi,
    };
  }

  const normalizedUrl = normalizeUrl(cleanedInput);

  if (!isHttpUrl(normalizedUrl)) {
    throw new Error("Please enter a valid URL or DOI");
  }

  const cleanedUrl = cleanUrl(normalizedUrl);
  const web = await fetchWebMetadata(cleanedUrl);
  const host = hostnameFromUrl(cleanedUrl);

  const siteName = cleanText(web.siteName) || host;
  const metadata: CitationMetadata = {
    url: cleanedUrl,
    accessDate: new Date(),
    siteName,
    title: cleanTitle(web.title || titleFromUrl(cleanedUrl), siteName),
    author: cleanText(web.author || "") || undefined,
    publishedDate: web.publishedDate,
  };

  const webCitation = buildMlaCitation(metadata);
  return {
    citation: webCitation.text,
    citationHtml: webCitation.html,
    citationMarkdown: webCitation.markdown,
    metadata,
    sourceType: "Web Page",
    sourceLabel: host,
  };
}

/**
 * MLA Citation Builder
 */
function buildMlaCitation(metadata: CitationMetadata): {
  text: string;
  html: string;
  markdown: string;
} {
  let author = formatAuthor(metadata.author || "");
  const title = cleanTitle(metadata.title || "", metadata.siteName);
  const siteName = cleanText(metadata.siteName) || "";
  const publishedDate = formatPublicationDate(metadata.publishedDate);
  const url = formatUrlForCitation(metadata.url || "");
  const accessDate = formatAccessDate(metadata.accessDate || new Date());

  const normAuthor = normalizeForCompare(author);
  const normSite = normalizeForCompare(siteName);

  if (normAuthor && normSite && normAuthor === normSite) {
    author = "";
  }

  const textParts: string[] = [];
  const htmlParts: string[] = [];
  const mdParts: string[] = [];

  if (author) {
    const authorPart = withTerminalPunctuation(author);
    textParts.push(authorPart);
    htmlParts.push(escapeHtml(authorPart));
    mdParts.push(escapeMarkdown(authorPart));
  }

  if (title) {
    const titleText = withTerminalPunctuation(title);
    textParts.push(`"${titleText}"`);
    htmlParts.push(`"${escapeHtml(titleText)}"`);
    mdParts.push(`"${escapeMarkdown(titleText)}"`);
  }

  const textContainerParts: string[] = [];
  const htmlContainerParts: string[] = [];
  const mdContainerParts: string[] = [];
  if (siteName) {
    textContainerParts.push(siteName);
    htmlContainerParts.push(`<i>${escapeHtml(siteName)}</i>`);
    mdContainerParts.push(`*${escapeMarkdown(siteName)}*`);
  }
  if (publishedDate) {
    textContainerParts.push(publishedDate);
    htmlContainerParts.push(escapeHtml(publishedDate));
    mdContainerParts.push(escapeMarkdown(publishedDate));
  }
  if (url) {
    textContainerParts.push(url);
    htmlContainerParts.push(escapeHtml(url));
    mdContainerParts.push(escapeMarkdown(url));
  }

  if (textContainerParts.length > 0) {
    textParts.push(textContainerParts.join(", ") + ".");
    htmlParts.push(htmlContainerParts.join(", ") + ".");
    mdParts.push(mdContainerParts.join(", ") + ".");
  }

  const accessPart = `Accessed ${accessDate}.`;
  textParts.push(accessPart);
  htmlParts.push(escapeHtml(accessPart));
  mdParts.push(escapeMarkdown(accessPart));

  const cleanUp = (s: string) =>
    s.replace(/\s+/g, " ").replace(/\.\./g, ".").trim();

  return {
    text: cleanUp(textParts.join(" ")),
    html: cleanUp(htmlParts.join(" ")),
    markdown: cleanUp(mdParts.join(" ")),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildResultMarkdown(result: CitationResult): string {
  const title =
    cleanTitle(result.metadata.title || "", result.metadata.siteName) ||
    "Untitled Source";

  return `# ${escapeMarkdown(title)}

${result.sourceType} source

---

> ${result.citationMarkdown}

---

**⌘ Enter** to copy  ·  **⌘ ⇧ Enter** to paste`;
}

function buildResultMetadata(result: CitationResult) {
  const metadata = result.metadata;
  const author = cleanText(metadata.author || "");
  const siteName = cleanText(metadata.siteName || "");
  const publishedDate = formatPublicationDate(metadata.publishedDate);
  const accessDate = formatAccessDate(metadata.accessDate || new Date());
  const sourceColor = result.sourceType === "DOI" ? Color.Purple : Color.Blue;

  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Format">
        <Detail.Metadata.TagList.Item
          text={result.sourceType}
          color={sourceColor}
        />
        <Detail.Metadata.TagList.Item text="MLA 9" color={Color.Green} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title="Author"
        text={author || "Not found"}
        icon={{
          source: Icon.Person,
          tintColor: author ? Color.PrimaryText : Color.SecondaryText,
        }}
      />
      <Detail.Metadata.Label
        title="Container"
        text={siteName || "Not found"}
        icon={{
          source: Icon.Book,
          tintColor: siteName ? Color.PrimaryText : Color.SecondaryText,
        }}
      />
      <Detail.Metadata.Label
        title="Published"
        text={publishedDate || "Not found"}
        icon={{
          source: Icon.Calendar,
          tintColor: publishedDate ? Color.PrimaryText : Color.SecondaryText,
        }}
      />
      <Detail.Metadata.Label
        title="Accessed"
        text={accessDate}
        icon={{ source: Icon.Clock, tintColor: Color.PrimaryText }}
      />
      <Detail.Metadata.Separator />
      {metadata.url ? (
        <Detail.Metadata.Link
          title={result.sourceType === "DOI" ? "DOI" : "URL"}
          text={formatUrlForCitation(metadata.url)}
          target={metadata.url}
        />
      ) : null}
    </Detail.Metadata>
  );
}

function describeInputKind(value: string): { title: string; text: string } {
  const cleaned = cleanInput(value);

  if (!cleaned) {
    return {
      title: "Ready for a source",
      text: "Paste a URL or DOI, then generate a citation.",
    };
  }

  if (extractDoi(cleaned)) {
    return {
      title: "DOI detected",
      text: "QuickCite will use Crossref and doi.org metadata only.",
    };
  }

  if (isHttpUrl(normalizeUrl(cleaned)) || looksLikeBareDomain(cleaned)) {
    return {
      title: "Web page detected",
      text: "QuickCite will read page metadata and clean the citation URL.",
    };
  }

  return {
    title: "Needs a URL or DOI",
    text: "Try a full URL, a bare domain, or a DOI beginning with 10.",
  };
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, "\\$1");
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
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
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

function cleanTitle(title: string, siteName?: string): string {
  let cleaned = cleanText(title);

  if (!cleaned) return "";

  const separatorPattern = /\s+[|–—]\s+/g;
  let lastSepIndex = -1;
  let lastSepLength = 0;
  let match: RegExpExecArray | null;

  while ((match = separatorPattern.exec(cleaned)) !== null) {
    lastSepIndex = match.index;
    lastSepLength = match[0].length;
  }

  if (lastSepIndex !== -1) {
    const beforeSep = cleaned.substring(0, lastSepIndex).trim();
    const afterSep = cleaned.substring(lastSepIndex + lastSepLength).trim();

    if (beforeSep && looksLikeSiteNameSuffix(afterSep, siteName)) {
      cleaned = beforeSep;
    }
  }

  return cleaned.replace(/\s+/g, " ");
}

function looksLikeSiteNameSuffix(segment: string, siteName?: string): boolean {
  const cleaned = cleanText(segment);
  if (!cleaned) return false;

  if (siteName) {
    const normSegment = normalizeForCompare(cleaned);
    const normSite = normalizeForCompare(siteName);
    if (normSegment && normSite && normSegment === normSite) return true;
  }

  if (/^[a-z0-9-]+\.[a-z]{2,}$/i.test(cleaned)) return true;

  return /^(Home|Homepage|Official Site|Official Website|Blog|News|Opinion|Video|YouTube|Wikipedia|Reddit|Medium|Substack|GitHub|MDN|MDN Web Docs|BBC|CNN|NPR|Reuters|AP News|The (?:New York Times|Washington Post|Guardian|Atlantic|Verge|Wall Street Journal|Economist|Independent|Telegraph|Observer|Intercept|Hill|Cut|Ringer))$/i.test(
    cleaned,
  );
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
