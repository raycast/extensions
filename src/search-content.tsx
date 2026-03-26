import {
  showToast,
  Toast,
  open,
  getPreferenceValues,
  showHUD,
  popToRoot,
  LaunchProps,
  Detail,
  ActionPanel,
  Action,
  AI,
  environment,
  Icon,
  Color,
  Clipboard,
  getSelectedText,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useEffect } from "react";

interface ExternalSource {
  name: string;
  snippet?: string;
  url?: string;
  confidence: number;
}

interface TOCQuality {
  quality: "good" | "medium" | "poor";
  confidence: number;
  reason: string;
  hasEnoughInfo: boolean;
}

interface KlappentextResult {
  text: string;
  keywords: string[];
  sources: ExternalSource[];
  confidence: number;
  warning?: string;
}

const DNB_SRU_BASE_URL = "https://services.dnb.de/sru/dnb";
const DNB_BASE_URL = "https://d-nb.info";
const TOC_SUFFIX = "/04";
const TEXT_SUFFIX = "/34";
const EUROBUCH_PLATFORM = "106795";

/**
 * Normalizes ISBN by removing all hyphens, spaces, and other separators
 */
function normalizeISBN(isbn: string): string {
  return isbn.replace(/[-\s]/g, "");
}

/**
 * Validates ISBN-10 or ISBN-13 format
 */
function isValidISBN(isbn: string): boolean {
  const normalized = normalizeISBN(isbn);
  return /^\d{10}$/.test(normalized) || /^\d{13}$/.test(normalized);
}

/**
 * Searches DNB SRU API for book metadata including title and author
 */
async function searchDNBMetadata(isbn: string): Promise<{ idn: string; title: string; author: string } | null> {
  const normalized = normalizeISBN(isbn);
  const sruUrl = `${DNB_SRU_BASE_URL}?version=1.1&operation=searchRetrieve&query=isbn%3D${normalized}&recordSchema=MARC21-xml&maximumRecords=1`;

  try {
    const response = await fetch(sruUrl);

    if (!response.ok) {
      throw new Error(`DNB API returned status ${response.status}`);
    }

    const text = await response.text();

    // Extract IDN from controlfield 001
    const idnMatch = text.match(/<controlfield tag="001">(\d+X?)<\/controlfield>/);
    if (!idnMatch) return null;
    const idn = idnMatch[1];

    // Extract title from datafield 245, subfield a
    const titleMatch = text.match(/<datafield tag="245"[^>]*>[\s\S]*?<subfield code="a">([^<]+)<\/subfield>/);
    const title = titleMatch?.[1]?.trim().replace(/\s*\/\s*$/, "") || "";

    // Extract full 245 field for fallback author parsing
    const field245 = text.match(/<datafield tag="245"[^>]*>([\s\S]*?)<\/datafield>/);
    const field245text = field245?.[1] ?? "";

    // Extract author: Priorität 100$a → 700$a → 110$a → aus 245 → ""
    const field100 = text.match(/<datafield tag="100"[^>]*>[\s\S]*?<subfield code="a">([^<]+)<\/subfield>/);
    const field700 = text.match(/<datafield tag="700"[^>]*>[\s\S]*?<subfield code="a">([^<]+)<\/subfield>/);
    const field110 = text.match(/<datafield tag="110"[^>]*>[\s\S]*?<subfield code="a">([^<]+)<\/subfield>/);

    // Fallback: Autor aus 245-Subfields extrahieren (z.B. "/ von Ingrid Knoche" oder "/ Max Mustermann")
    let field245author = "";
    if (!field100 && !field700 && !field110) {
      const subfieldValues = [...field245text.matchAll(/<subfield code="[^"]*">([^<]+)<\/subfield>/g)].map((m) => m[1]);
      const combined = subfieldValues.join(" ");
      // Priorität 1: "von Vorname Nachname" (beide Teile mit Großbuchstabe)
      const vonMatch = combined.match(/\bvon\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)+)/);
      // Priorität 2: "/ Vorname Nachname" (direkt nach Slash, kein "von")
      const slashMatch = combined.match(/\/\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)+)(?:\s|$|\.\.\.)/);
      field245author = vonMatch?.[1]?.trim() ?? slashMatch?.[1]?.trim() ?? "";
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[DNB] ISBN ${normalized} – creator fields:`);
      console.log(`  MARC 100 (Haupteintrag Person): ${field100?.[1] ?? "—"}`);
      console.log(`  MARC 700 (Nebeneintrag Person): ${field700?.[1] ?? "—"}`);
      console.log(`  MARC 110 (Körperschaft):        ${field110?.[1] ?? "—"}`);
      console.log(`  MARC 245 (Titelfeld, komplett): ${field245text.replace(/\s+/g, " ").trim()}`);
      console.log(`  Fallback aus 245:               ${field245author || "—"}`);
    }

    const authorRaw = field100?.[1] ?? field700?.[1] ?? field110?.[1] ?? field245author;
    const author = authorRaw.trim().replace(/,\s*$/, "");

    if (process.env.NODE_ENV === "development") {
      console.log(`  → Extrahierter Autor:           ${author || "(leer)"}`);
    }

    return { idn, title, author };
  } catch (error) {
    console.error("Error searching DNB:", error);
    throw error;
  }
}

/**
 * Checks if content is available at the given URL
 */
async function checkContentAvailable(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeoutId);
    // 405 = HEAD not allowed → treat as available and let browser handle it
    return response.ok || response.status === 405;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

/**
 * Assesses the quality of a table of contents for generating a book description.
 * Returns poor/hasEnoughInfo=false immediately if tocText is empty (no AI call).
 */
async function assessTOCQuality(tocText: string): Promise<TOCQuality> {
  if (!tocText.trim()) {
    return { quality: "poor", confidence: 0, reason: "No TOC text available", hasEnoughInfo: false };
  }

  const prompt = `Bewerte die Qualität dieses Inhaltsverzeichnisses für die Klappentext-Generierung.

Inhaltsverzeichnis:
${tocText}

Antworte NUR mit folgendem JSON-Format (keine Markdown-Codeblöcke):
{
  "quality": "good" | "medium" | "poor",
  "confidence": 0-100,
  "reason": "Kurze Begründung auf Deutsch",
  "hasEnoughInfo": true | false
}

Kriterien:
- "good": Aussagekräftige Kapitel-Titel mit thematischem Kontext (z.B. "Die Entdeckung im Meer", "Der Angriff der Wale")
- "medium": Einige informative Titel, aber auch generische (z.B. Mix aus "Kapitel 1" und "Die Krise")
- "poor": Nur Nummern/generische Titel ohne Kontext (z.B. "Kapitel 1", "Teil I", "Prolog", "Epilog")

Antworte NUR mit dem JSON-Objekt, nichts anderes!`;

  try {
    const response = await AI.ask(prompt, { creativity: 0.3 });
    const cleaned = response.replace(/```json\s*|\s*```/g, "").trim();
    const result = JSON.parse(cleaned);
    return result;
  } catch (error) {
    console.error("TOC quality assessment failed:", error);
    return { quality: "medium", confidence: 50, reason: "Automatic assessment failed", hasEnoughInfo: true };
  }
}

// --- Eurobuch helpers (extracted from eurobuch-search-v2) ---

const decodeXMLEntities = (str: string): string =>
  str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

interface EurobuchBook {
  title: string;
  author: string;
}

const parseEurobuchXML = (xml: string): EurobuchBook[] => {
  const books: EurobuchBook[] = [];
  const bookRegex = /<Book\s+([^>]*?)\s*\/>/g;
  let match: RegExpExecArray | null;

  while ((match = bookRegex.exec(xml)) !== null) {
    const captured = match[1];
    const getAttribute = (name: string): string => {
      const value = new RegExp(`${name}="([^"]*)"`, "i").exec(captured)?.[1] || "";
      return decodeXMLEntities(value);
    };
    const book = { title: getAttribute("title"), author: getAttribute("author") };
    if (book.title) books.push(book);
  }

  return books;
};

const convertISBN10to13 = (isbn10: string): string => {
  const clean = isbn10.replace(/[-\s]/g, "");
  if (clean.length !== 10) return isbn10;
  const base = "978" + clean.substring(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  return base + ((10 - (sum % 10)) % 10);
};

/**
 * Fetches book info from Eurobuch API (requires platform credentials in preferences)
 */
async function fetchEurobuchInfo(isbn: string): Promise<ExternalSource | null> {
  const prefs = getPreferenceValues<Preferences.SearchContent>();

  // Skip if no password configured
  if (!prefs.eurobuchPassword) return null;

  try {
    const clean = isbn.replace(/[-\s]/g, "");
    const searchIsbn = clean.length === 10 ? convertISBN10to13(clean) : clean;

    let clientIP = "0.0.0.0";
    try {
      const ipRes = await fetch("https://api.ipify.org?format=text", { signal: AbortSignal.timeout(3000) });
      clientIP = await ipRes.text();
    } catch {
      /* use fallback IP */
    }

    const params = new URLSearchParams({
      platform: EUROBUCH_PLATFORM,
      password: prefs.eurobuchPassword || "",
      isbn: searchIsbn,
      author: "",
      title: "",
      mediatype: "0",
      clientip: clientIP,
      format: "xml",
      maxresults: "1",
    });

    const response = await fetch(`https://www.eurobuch.de/extreq/meta/extquery.php?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;

    const books = parseEurobuchXML(await response.text());
    if (books.length === 0) return null;

    const book = books[0];
    return {
      name: "Eurobuch",
      snippet: book.author ? `${book.title} / ${book.author}` : book.title,
      url: `https://www.eurobuch.de/buch/isbn/${searchIsbn}.html`,
      confidence: 90,
    };
  } catch (error) {
    console.error("Eurobuch fetch failed:", error);
    return null;
  }
}

/**
 * Fetches book description from Google Books API
 */
async function fetchGoogleBooksInfo(isbn: string): Promise<ExternalSource | null> {
  try {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);

    if (!response.ok) {
      console.log("Google Books API error:", response.status);
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const items = data.items as Array<{ volumeInfo: { description?: string; infoLink?: string } }> | undefined;

    if (!items || items.length === 0) {
      return null;
    }

    const book = items[0].volumeInfo;
    const description = book.description;

    if (!description) {
      return null;
    }

    return {
      name: "Google Books (Publisher Description)",
      snippet: description.substring(0, 500),
      url: book.infoLink || `https://books.google.com/books?isbn=${isbn}`,
      confidence: 85,
    };
  } catch (error) {
    console.error("Google Books fetch failed:", error);
    return null;
  }
}

/**
 * Fetches book info from Wikipedia
 */
async function fetchWikipediaInfo(title: string, author: string): Promise<ExternalSource | null> {
  try {
    // Search for the book on German Wikipedia
    const searchQuery = encodeURIComponent(`${title} ${author}`);
    const searchUrl = `https://de.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchQuery}&format=json&origin=*`;

    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) return null;

    const searchData = (await searchResponse.json()) as Record<string, unknown>;
    const wikiQuery = searchData.query as { search?: Array<{ title: string }> } | undefined;

    if (!wikiQuery?.search || wikiQuery.search.length === 0) {
      return null;
    }

    const firstResult = wikiQuery.search[0];
    const pageTitle = firstResult.title;

    // Get page extract
    const extractUrl = `https://de.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`;

    const extractResponse = await fetch(extractUrl);
    if (!extractResponse.ok) return null;

    const extractData = (await extractResponse.json()) as Record<string, unknown>;
    const extractQuery = extractData.query as { pages?: Record<string, { extract?: string }> } | undefined;
    const pages = extractQuery?.pages;

    if (!pages) return null;

    const page = Object.values(pages)[0];
    const extract = page?.extract;

    if (!extract) return null;

    return {
      name: "Wikipedia",
      snippet: extract.substring(0, 500),
      url: `https://de.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
      confidence: 75,
    };
  } catch (error) {
    console.error("Wikipedia fetch failed:", error);
    return null;
  }
}

/**
 * Generates a book description using clipboard TOC and/or external sources.
 * All external sources are always fetched when isbn is available.
 */
async function generateVerifiedKlappentext(
  tocUrl: string,
  isbn: string,
  title: string,
  author: string,
  clipboardToc: string,
): Promise<KlappentextResult> {
  const sources: ExternalSource[] = [];

  // 1. Assess TOC quality from clipboard text (no AI call if empty)
  const hasTOCText = clipboardToc.trim().length > 0;
  const tocQuality = await assessTOCQuality(clipboardToc);

  // 2. Always fetch all external sources when isbn is available
  // Priority order: Eurobuch (90) → Google Books (85) → Wikipedia (75)
  if (isbn) {
    const eurobuch = await fetchEurobuchInfo(isbn);
    if (eurobuch) sources.push(eurobuch);

    const googleBooks = await fetchGoogleBooksInfo(isbn);
    if (googleBooks) sources.push(googleBooks);

    const wikipedia = await fetchWikipediaInfo(title, author);
    if (wikipedia) sources.push(wikipedia);
  }

  // 3. Return insufficient data only if neither TOC nor any external source available
  if (!hasTOCText && sources.length === 0) {
    return {
      text: "Insufficient information available. No table of contents and no external sources could be found.",
      keywords: [],
      sources: [],
      confidence: 0,
      warning: "⚠️ Insufficient information base for a reliable book description",
    };
  }

  // 4. Generate book description with all available sources
  const poorTocWithSources = (!hasTOCText || tocQuality.quality === "poor") && sources.length > 0;

  const prompt = poorTocWithSources
    ? `Du bist ein sachlicher Buchbeschreibungs-Generator.

REGEL: Erfinde NICHTS. Nutze ausschließlich die bereitgestellten Quellen.

BUCH-INFORMATIONEN:
Titel: ${title}
Autor: ${author}
ISBN: ${isbn}

EXTERNE QUELLEN:
${sources.map((s) => `\n${s.name}:\n${s.snippet}\nURL: ${s.url}\n`).join("\n")}

AUFGABE:
1. Erstelle eine sachliche Kurzbeschreibung (max. 100 Wörter, deutsch)
   - Kein Roman-Klappentext, keine blumige Sprache
   - Beschreibe das Themengebiet: was lernt/findet der Leser?
   - Nutze nur Informationen aus den Quellen oben
   - Falls zu wenig Info: Antworte "INSUFFICIENT_DATA: [Grund]"

2. Erstelle 5 Suchwörter (Hauptwörter, kommagetrennt)

3. Konfidenz: 40-60% (da kein Buchinhalt direkt verfügbar)

ANTWORT-FORMAT (exakt so):
KLAPPENTEXT:
[Deine sachliche Beschreibung - oder "INSUFFICIENT_DATA: [Grund]"]

SUCHWÖRTER:
[Begriff1, Begriff2, Begriff3, Begriff4, Begriff5]

QUELLEN_GENUTZT:
[Liste der genutzten Quellen]

KONFIDENZ:
[Zahl 40-60]%`
    : `Du bist ein deutschsprachiger Klappentext-Generator mit strengem Fact-Checking.

KRITISCH WICHTIG - GOLDEN RULES:
1. Erfinde NICHTS! Nutze nur Informationen aus den bereitgestellten Quellen.
2. Falls unsicher: Antworte "INSUFFICIENT_DATA" statt zu spekulieren.
3. Markiere Unsicherheiten klar im Text.
4. Besser kein Klappentext als ein falscher!

BUCH-INFORMATIONEN:
Titel: ${title}
Autor: ${author}
ISBN: ${isbn}

${
  sources.length > 0
    ? `EXTERNE QUELLEN (PRIMÄR):
${sources.map((s) => `\n${s.name}:\n${s.snippet}\nURL: ${s.url}\n`).join("\n")}`
    : ""
}

INHALTSVERZEICHNIS (SEKUNDÄR - nur zur Strukturierung):
${clipboardToc}

QUALITÄT DES INHALTSVERZEICHNISSES:
${tocQuality.reason}
Aussagekraft: ${tocQuality.quality}

AUFGABE:
1. Erstelle einen Klappentext (max. 150 Wörter, deutsch)
   - Nutze PRIMÄR die externen Quellen für Inhalt/Handlung
   - Nutze Inhaltsverzeichnis nur zur Strukturierung
   - Falls Quellen widersprüchlich: Erwähne das
   - Falls zu wenig Info: Antworte "INSUFFICIENT_DATA: [Grund]"

2. Erstelle 5 Suchwörter (Hauptwörter, kommagetrennt)

3. Gib deine Konfidenz an (0-100%)

ANTWORT-FORMAT (exakt so):
KLAPPENTEXT:
[Dein Klappentext hier - oder "INSUFFICIENT_DATA: [Grund]"]

SUCHWÖRTER:
[Begriff1, Begriff2, Begriff3, Begriff4, Begriff5]

QUELLEN_GENUTZT:
[Liste der genutzten Quellen]

KONFIDENZ:
[Zahl 0-100]%`;

  try {
    const response = await AI.ask(prompt, { creativity: 0.7 });

    // Parse response
    const klappentextMatch = response.match(/KLAPPENTEXT:\s*(.+?)(?=\n\nSUCHWÖRTER:|$)/s);
    const keywordsMatch = response.match(/SUCHWÖRTER:\s*(.+?)(?=\n\nQUELLEN_GENUTZT:|$)/s);
    const confidenceMatch = response.match(/KONFIDENZ:\s*(\d+)%/);

    const klappentext = klappentextMatch?.[1]?.trim() || "";
    const keywordsStr = keywordsMatch?.[1]?.trim() || "";
    const rawConfidence = parseInt(confidenceMatch?.[1] || "50", 10);

    // Floor confidence based on available sources with content:
    // 2+ sources with snippets → at least 70%, 1 source → at least 60%
    const sourcesWithSnippets = sources.filter((s) => s.snippet && s.snippet.trim().length > 0).length;
    const confidence =
      sourcesWithSnippets >= 2
        ? Math.max(rawConfidence, 70)
        : sourcesWithSnippets >= 1
          ? Math.max(rawConfidence, 60)
          : rawConfidence;

    // Check for insufficient data
    if (klappentext.includes("INSUFFICIENT_DATA")) {
      const reason = klappentext.replace("INSUFFICIENT_DATA:", "").trim();
      return {
        text: `Book description could not be generated: ${reason}`,
        keywords: [],
        sources,
        confidence: 0,
        warning: "⚠️ AI could not generate a reliable book description",
      };
    }

    // Parse keywords
    const keywords = keywordsStr
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
      .slice(0, 5);

    // Generate warning if confidence is low
    let warning: string | undefined;
    if (poorTocWithSources) {
      warning = "ℹ️ Based on title and external sources – no book content available.";
    } else if (confidence < 60) {
      warning = "⚠️ Low confidence - please review manually!";
    } else if (tocQuality.quality === "poor") {
      warning = "ℹ️ Based mainly on external sources (table of contents has little informational value)";
    }

    return {
      text: klappentext,
      keywords,
      sources,
      confidence,
      warning,
    };
  } catch (error) {
    console.error("Klappentext generation failed:", error);
    throw error;
  }
}

/**
 * Detail View Component for showing AI-generated Klappentext
 */
function KlappentextView({
  result,
  tocUrl,
  isbn,
  title,
  author,
  tocFromClipboard,
}: {
  result: KlappentextResult;
  tocUrl: string;
  isbn: string;
  title: string;
  author: string;
  tocFromClipboard: string | null;
}) {
  const getConfidenceColor = (conf: number): Color => {
    if (conf >= 70) return Color.Green;
    if (conf >= 50) return Color.Yellow;
    return Color.Red;
  };

  const getConfidenceIcon = (conf: number): Icon => {
    if (conf >= 70) return Icon.CheckCircle;
    if (conf >= 50) return Icon.QuestionMarkCircle;
    return Icon.XMarkCircle;
  };

  return (
    <Detail
      markdown={`# 📚 ${title}

**Author:** ${author}
**ISBN:** ${isbn}

${result.warning ? `\n> ${result.warning}\n` : ""}

---

## Book Description

${result.text}

---

**Keywords:** ${result.keywords.join(", ") || "None"}

---

${
  result.sources.length > 0
    ? `## 🔍 Sources Used

${result.sources.map((s) => `- **${s.name}** (Confidence: ${s.confidence}%)${s.url ? `\n  [Open Link](${s.url})` : ""}`).join("\n")}

---
`
    : ""
}

*Generated with Raycast AI • Confidence: ${result.confidence}%*`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            {tocUrl ? <Action.OpenInBrowser title="Open Table of Contents" url={tocUrl} /> : null}
            <Action.CopyToClipboard title="Copy Book Description" content={result.text} />
            <Action.CopyToClipboard
              title="Copy Book Description with Metadata"
              content={`${result.text}\n\nKeywords: ${result.keywords.join(", ")}\n\nSources: ${result.sources.map((s) => s.name).join(", ")}\n\nISBN: ${isbn}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Sources">
            {result.sources.map((source, idx) =>
              source.url ? <Action.OpenInBrowser key={idx} title={`Open ${source.name}`} url={source.url} /> : null,
            )}
          </ActionPanel.Section>
          <Action title="Close" onAction={() => popToRoot()} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          {title ? <Detail.Metadata.Label title="Title" text={title} /> : null}
          {author ? <Detail.Metadata.Label title="Author" text={author} /> : null}
          {isbn ? <Detail.Metadata.Label title="ISBN" text={isbn} /> : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Confidence"
            text={`${result.confidence}%`}
            icon={{ source: getConfidenceIcon(result.confidence), tintColor: getConfidenceColor(result.confidence) }}
          />
          <Detail.Metadata.Label title="Sources" text={result.sources.length.toString()} />
          <Detail.Metadata.Label title="TOC Source" text={tocFromClipboard ? "Clipboard" : "Not Available"} />
          <Detail.Metadata.Separator />
          {tocUrl ? <Detail.Metadata.Link title="DNB" text="Table of Contents" target={tocUrl} /> : null}
        </Detail.Metadata>
      }
    />
  );
}

/**
 * Main Command Component
 */
export default function Command(props: LaunchProps<{ arguments: Arguments.SearchContent }>) {
  const { isbn: argIsbn, tocText: argTocText } = props.arguments;
  const preferences = getPreferenceValues<Preferences.SearchContent>();

  const [isLoading, setIsLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const [result, setResult] = useState<KlappentextResult | null>(null);
  const [bookInfo, setBookInfo] = useState<{
    title: string;
    author: string;
    tocUrl: string;
    tocFromClipboard: string | null;
    isbn: string;
  } | null>(null);

  useEffect(() => {
    async function runCommand() {
      // Read clipboard once for both ISBN auto-fill and TOC detection
      let clipboardText: string | undefined;
      try {
        clipboardText = (await Clipboard.readText()) ?? undefined;
      } catch {
        // silent fail
      }

      // Auto-fill ISBN: arg → selected text → clipboard
      let effectiveIsbn = argIsbn?.trim() || "";
      if (!effectiveIsbn) {
        try {
          const selectedText = await getSelectedText();
          const match = selectedText.replace(/[-\s]/g, "").match(/\d{10,13}/);
          if (match && isValidISBN(match[0])) {
            effectiveIsbn = match[0];
          }
        } catch {
          // silent fail – no selected text available
        }
      }
      if (!effectiveIsbn && clipboardText) {
        const match = clipboardText.replace(/[-\s]/g, "").match(/\d{10,13}/);
        if (match && isValidISBN(match[0])) {
          effectiveIsbn = match[0];
        }
      }

      // Determine TOC text: from arg or clipboard (only if not an ISBN-like string)
      const isClipboardTOC =
        !!clipboardText && clipboardText.length > 100 && !/^\d[\d\s-]{8,}$/.test(clipboardText.trim());
      const tocFromClipboard = isClipboardTOC ? clipboardText : null;
      const effectiveTocText = argTocText?.trim() || tocFromClipboard || "";

      // Case C: No ISBN and no TOC → prompt user
      if (!effectiveIsbn && !effectiveTocText) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Input",
          message: "Please enter an ISBN or paste a table of contents",
        });
        setIsLoading(false);
        return;
      }

      // Case A: TOC present but generation disabled → point to preferences
      if (!effectiveIsbn && effectiveTocText && !preferences.generateKlappentext) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Generation Disabled",
          message: "Enable 'Generate Book Description' in Preferences",
          primaryAction: {
            title: "Open Preferences",
            onAction: () => openExtensionPreferences(),
          },
        });
        setIsLoading(false);
        return;
      }

      // Case B: TOC present and generation enabled → generate without DNB lookup
      if (!effectiveIsbn && effectiveTocText && preferences.generateKlappentext) {
        if (!environment.canAccess(AI)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Raycast Pro Required",
            message: "Book description generation requires Raycast Pro or BYOK",
          });
          setIsLoading(false);
          return;
        }

        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Generating book description...",
          message: "Using TOC from clipboard",
        });

        try {
          const klappentextResult = await generateVerifiedKlappentext("", "", "", "", effectiveTocText);
          setBookInfo({ title: "", author: "", tocUrl: "", tocFromClipboard: tocFromClipboard ?? null, isbn: "" });
          setResult(klappentextResult);
          setShowDetail(true);
          await toast.hide();
          setIsLoading(false);
        } catch (error) {
          console.error("Klappentext generation failed:", error);
          await toast.hide();
          await showToast({
            style: Toast.Style.Failure,
            title: "Book Description Generation Failed",
            message: error instanceof Error ? error.message : "An unexpected error occurred",
          });
          setIsLoading(false);
        }
        return;
      }

      // Normal flow: ISBN present
      if (!isValidISBN(effectiveIsbn)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid ISBN",
          message: "Please enter a valid ISBN-10 or ISBN-13",
        });
        setIsLoading(false);
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Searching DNB...",
        message: `ISBN: ${normalizeISBN(effectiveIsbn)}`,
      });

      try {
        // Step 1: Search for book metadata
        toast.message = "Fetching book information...";
        const metadata = await searchDNBMetadata(effectiveIsbn);

        if (!metadata) {
          await toast.hide();
          await showToast({
            style: Toast.Style.Failure,
            title: "No Results",
            message: "No DNB entries found for this ISBN",
          });
          setIsLoading(false);
          return;
        }

        const { idn, title, author } = metadata;
        const baseUrl = `${DNB_BASE_URL}/${idn}`;
        const tocUrl = `${baseUrl}${TOC_SUFFIX}`;
        const textUrl = `${baseUrl}${TEXT_SUFFIX}`;

        // Step 2: Check availability
        toast.message = "Checking availability...";
        const tocAvailable = await checkContentAvailable(tocUrl);

        if (!tocAvailable) {
          await toast.hide();
          await showToast({
            style: Toast.Style.Failure,
            title: "Table of Contents Not Available",
            message: "No digitized table of contents available for this book",
          });
          await open(baseUrl);
          setIsLoading(false);
          return;
        }

        // Step 3: Generate book description if preference is enabled
        if (preferences.generateKlappentext) {
          if (!environment.canAccess(AI)) {
            await toast.hide();
            await showToast({
              style: Toast.Style.Success,
              title: "Table of Contents Opened",
              message: "Book description generation requires Raycast Pro or BYOK",
            });
            await open(tocUrl);
            await popToRoot();
            setIsLoading(false);
            return;
          }

          const tocTextForGen = argTocText?.trim() || tocFromClipboard || "";
          if (tocFromClipboard && !argTocText) {
            toast.message = "TOC from clipboard detected – generating book description...";
          } else {
            toast.message = "Checking sources and generating book description...";
          }

          try {
            const klappentextResult = await generateVerifiedKlappentext(
              tocUrl,
              normalizeISBN(effectiveIsbn),
              title,
              author,
              tocTextForGen,
            );

            setBookInfo({
              title,
              author,
              tocUrl,
              tocFromClipboard: tocFromClipboard ?? null,
              isbn: normalizeISBN(effectiveIsbn),
            });
            setResult(klappentextResult);
            setShowDetail(true);
            await toast.hide();
            setIsLoading(false);
          } catch (error) {
            console.error("Klappentext generation failed:", error);
            await toast.hide();
            await showToast({
              style: Toast.Style.Failure,
              title: "Book Description Generation Failed",
              message: "Opening table of contents instead",
            });
            await open(tocUrl);
            await popToRoot();
            setIsLoading(false);
          }
        } else {
          // Generation disabled – open content directly
          const urlsToOpen: string[] = [];

          if (preferences.contentType === "toc" || preferences.contentType === "both") {
            if (tocAvailable) urlsToOpen.push(tocUrl);
          }

          if (preferences.contentType === "text" || preferences.contentType === "both") {
            const textAvailable = await checkContentAvailable(textUrl);
            if (textAvailable) urlsToOpen.push(textUrl);
          }

          if (urlsToOpen.length > 0) {
            await Promise.all(urlsToOpen.map((url) => open(url)));
            await toast.hide();
            const contentDesc =
              urlsToOpen.length > 1
                ? "Table of Contents & Content Text"
                : urlsToOpen[0].endsWith(TOC_SUFFIX)
                  ? "Table of Contents"
                  : "Content Text";
            await showHUD(`✓ ${contentDesc} opened`);
          } else {
            await open(baseUrl);
            await toast.hide();
            await showToast({
              style: Toast.Style.Success,
              title: "Catalog Entry Opened",
              message: "No digitized content available",
            });
          }

          await popToRoot();
          setIsLoading(false);
        }
      } catch (error) {
        await toast.hide();
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
        console.error("DNB Content Viewer Error:", error);
        setIsLoading(false);
      }
    }

    runCommand();
  }, []);

  if (isLoading) {
    return <Detail isLoading={true} markdown="# Loading book information..." />;
  }

  if (showDetail && result && bookInfo) {
    return (
      <KlappentextView
        result={result}
        tocUrl={bookInfo.tocUrl}
        isbn={bookInfo.isbn}
        title={bookInfo.title}
        author={bookInfo.author}
        tocFromClipboard={bookInfo.tocFromClipboard}
      />
    );
  }

  return null;
}
