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
} from "@raycast/api";
import { useState, useEffect } from "react";

interface Preferences {
  contentType: "toc" | "text" | "both";
  generateKlappentext: boolean;
}

interface Arguments {
  isbn: string;
}

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

    // Extract author from datafield 100, subfield a
    const authorMatch = text.match(/<datafield tag="100"[^>]*>[\s\S]*?<subfield code="a">([^<]+)<\/subfield>/);
    const author = authorMatch?.[1]?.trim().replace(/,\s*$/, "") || "";

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
 * Fetches table of contents text from DNB (simplified - would need actual scraping)
 */
async function fetchTOCText(tocUrl: string): Promise<string> {
  // NOTE: In real implementation, this would scrape the HTML/PDF
  // For now, return placeholder that AI can work with
  return `Inhaltsverzeichnis verfügbar unter: ${tocUrl}`;
}

/**
 * Assesses the quality of a table of contents for generating Klappentext
 */
async function assessTOCQuality(tocText: string): Promise<TOCQuality> {
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

    // Remove markdown code blocks if present
    const cleaned = response.replace(/```json\s*|\s*```/g, "").trim();

    const result = JSON.parse(cleaned);
    return result;
  } catch (error) {
    console.error("TOC quality assessment failed:", error);
    // Fallback to medium quality if assessment fails
    return {
      quality: "medium",
      confidence: 50,
      reason: "Automatische Bewertung fehlgeschlagen",
      hasEnoughInfo: true,
    };
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

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const book = data.items[0].volumeInfo;
    const description = book.description;

    if (!description) {
      return null;
    }

    return {
      name: "Google Books (Verlagsbeschreibung)",
      snippet: description.substring(0, 500), // Limit to 500 chars
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

    const searchData = await searchResponse.json();

    if (!searchData.query?.search || searchData.query.search.length === 0) {
      return null;
    }

    const firstResult = searchData.query.search[0];
    const pageTitle = firstResult.title;

    // Get page extract
    const extractUrl = `https://de.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`;

    const extractResponse = await fetch(extractUrl);
    if (!extractResponse.ok) return null;

    const extractData = await extractResponse.json();
    const pages = extractData.query?.pages;

    if (!pages) return null;

    const page = Object.values(pages)[0] as any;
    const extract = page.extract;

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
 * Generates verified Klappentext using multiple sources
 */
async function generateVerifiedKlappentext(
  tocUrl: string,
  isbn: string,
  title: string,
  author: string,
): Promise<KlappentextResult> {
  const sources: ExternalSource[] = [];

  // 1. Fetch TOC text
  const tocText = await fetchTOCText(tocUrl);

  // 2. Assess TOC quality
  const tocQuality = await assessTOCQuality(tocText);

  // 3. Fetch external sources (especially if TOC quality is poor/medium)
  if (tocQuality.quality === "poor" || tocQuality.quality === "medium") {
    // Fetch Google Books
    const googleBooks = await fetchGoogleBooksInfo(isbn);
    if (googleBooks) sources.push(googleBooks);

    // Fetch Wikipedia
    const wikipedia = await fetchWikipediaInfo(title, author);
    if (wikipedia) sources.push(wikipedia);
  }

  // 4. If TOC is poor and no external sources, return insufficient data
  if (tocQuality.quality === "poor" && sources.length === 0) {
    return {
      text: "Nicht genügend Informationen verfügbar. Das Inhaltsverzeichnis ist zu unspezifisch und es konnten keine externen Quellen gefunden werden.",
      keywords: [],
      sources: [],
      confidence: 0,
      warning: "⚠️ Keine ausreichende Informationsgrundlage für einen verlässlichen Klappentext",
    };
  }

  // 5. Generate Klappentext with sources
  const prompt = `Du bist ein deutschsprachiger Klappentext-Generator mit strengem Fact-Checking.

KRITISCH WICHTIG - GOLDEN RULES:
1. Erfinde NICHTS! Nutze nur Informationen aus den bereitgestellten Quellen.
2. Falls unsicher: Antworte "INSUFFICIENT_DATA" statt zu spekulieren.
3. Markiere Unsicherheiten klar im Text.
4. Besser kein Klappentext als ein falscher!

BUCH-INFORMATIONEN:
Titel: ${title}
Autor: ${author}
ISBN: ${isbn}

${sources.length > 0 ? `EXTERNE QUELLEN (PRIMÄR):
${sources.map((s) => `\n${s.name}:\n${s.snippet}\nURL: ${s.url}\n`).join("\n")}` : ""}

INHALTSVERZEICHNIS (SEKUNDÄR - nur zur Strukturierung):
${tocText}

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
    const confidence = parseInt(confidenceMatch?.[1] || "50", 10);

    // Check for insufficient data
    if (klappentext.includes("INSUFFICIENT_DATA")) {
      const reason = klappentext.replace("INSUFFICIENT_DATA:", "").trim();
      return {
        text: `Klappentext konnte nicht generiert werden: ${reason}`,
        keywords: [],
        sources,
        confidence: 0,
        warning: "⚠️ AI konnte keinen verlässlichen Klappentext erstellen",
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
    if (confidence < 50) {
      warning = "⚠️ Niedrige Konfidenz - Bitte manuell prüfen!";
    } else if (tocQuality.quality === "poor") {
      warning = "ℹ️ Basiert hauptsächlich auf externen Quellen (Inhaltsverzeichnis wenig aussagekräftig)";
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
}: {
  result: KlappentextResult;
  tocUrl: string;
  isbn: string;
  title: string;
  author: string;
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

**Autor:** ${author}
**ISBN:** ${isbn}

${result.warning ? `\n> ${result.warning}\n` : ""}

---

## Klappentext

${result.text}

---

**Suchwörter:** ${result.keywords.join(", ") || "Keine"}

---

${
  result.sources.length > 0
    ? `## 🔍 Verwendete Quellen

${result.sources.map((s) => `- **${s.name}** (Konfidenz: ${s.confidence}%)${s.url ? `\n  [Link öffnen](${s.url})` : ""}`).join("\n")}

---
`
    : ""
}

*Generiert mit Raycast AI • Konfidenz: ${result.confidence}%*`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Aktionen">
            <Action.OpenInBrowser title="Inhaltsverzeichnis öffnen" url={tocUrl} />
            <Action.CopyToClipboard title="Klappentext kopieren" content={result.text} />
            <Action.CopyToClipboard
              title="Klappentext + Metadaten kopieren"
              content={`${result.text}\n\nSuchwörter: ${result.keywords.join(", ")}\n\nQuellen: ${result.sources.map((s) => s.name).join(", ")}\n\nISBN: ${isbn}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Quellen">
            {result.sources.map((source, idx) =>
              source.url ? (
                <Action.OpenInBrowser key={idx} title={`${source.name} öffnen`} url={source.url} />
              ) : null,
            )}
          </ActionPanel.Section>
          <Action title="Schließen" onAction={() => popToRoot()} shortcut={{ modifiers: ["cmd"], key: "w" }} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Titel" text={title} />
          <Detail.Metadata.Label title="Autor" text={author} />
          <Detail.Metadata.Label title="ISBN" text={isbn} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Konfidenz"
            text={`${result.confidence}%`}
            icon={{ source: getConfidenceIcon(result.confidence), tintColor: getConfidenceColor(result.confidence) }}
          />
          <Detail.Metadata.Label title="Quellen" text={result.sources.length.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="DNB" text="Inhaltsverzeichnis" target={tocUrl} />
        </Detail.Metadata>
      }
    />
  );
}

/**
 * Main Command Component
 */
export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const { isbn } = props.arguments;
  const preferences = getPreferenceValues<Preferences>();

  const [isLoading, setIsLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const [result, setResult] = useState<KlappentextResult | null>(null);
  const [bookInfo, setBookInfo] = useState<{ title: string; author: string; tocUrl: string } | null>(null);

  useEffect(() => {
    async function runCommand() {
      // Validate ISBN format
      if (!isbn || isbn.trim().length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "ISBN erforderlich",
          message: "Bitte geben Sie eine ISBN ein",
        });
        setIsLoading(false);
        return;
      }

      if (!isValidISBN(isbn)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Ungültige ISBN",
          message: "Bitte geben Sie eine gültige ISBN-10 oder ISBN-13 ein",
        });
        setIsLoading(false);
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Suche DNB-Inhalte...",
        message: `ISBN: ${normalizeISBN(isbn)}`,
      });

      try {
        // Step 1: Search for book metadata
        toast.message = "Suche Buchinformationen...";
        const metadata = await searchDNBMetadata(isbn);

        if (!metadata) {
          await toast.hide();
          await showToast({
            style: Toast.Style.Failure,
            title: "Keine Ergebnisse",
            message: "Für diese ISBN wurden keine DNB-Einträge gefunden",
          });
          setIsLoading(false);
          return;
        }

        const { idn, title, author } = metadata;
        const baseUrl = `${DNB_BASE_URL}/${idn}`;
        const tocUrl = `${baseUrl}${TOC_SUFFIX}`;
        const textUrl = `${baseUrl}${TEXT_SUFFIX}`;

        // Step 2: Check availability
        toast.message = "Prüfe Verfügbarkeit...";
        const tocAvailable = await checkContentAvailable(tocUrl);

        if (!tocAvailable) {
          await toast.hide();
          await showToast({
            style: Toast.Style.Failure,
            title: "Inhaltsverzeichnis nicht verfügbar",
            message: "Für dieses Buch ist kein Inhaltsverzeichnis digitalisiert",
          });
          await open(baseUrl);
          setIsLoading(false);
          return;
        }

        // Step 3: Generate Klappentext if preference is enabled
        if (preferences.generateKlappentext) {
          if (!environment.canAccess(AI)) {
            await toast.hide();
            await showToast({
              style: Toast.Style.Success,
              title: "Inhaltsverzeichnis geöffnet",
              message: "Klappentext-Generierung benötigt Raycast Pro oder BYOK",
            });
            await open(tocUrl);
            await popToRoot();
            setIsLoading(false);
            return;
          }

          toast.message = "Prüfe Quellen und generiere Klappentext...";

          try {
            const klappentextResult = await generateVerifiedKlappentext(tocUrl, normalizeISBN(isbn), title, author);

            setBookInfo({ title, author, tocUrl });
            setResult(klappentextResult);
            setShowDetail(true);
            await toast.hide();
            setIsLoading(false);
          } catch (error) {
            console.error("Klappentext generation failed:", error);
            await toast.hide();
            await showToast({
              style: Toast.Style.Failure,
              title: "Klappentext-Generierung fehlgeschlagen",
              message: "Öffne stattdessen das Inhaltsverzeichnis",
            });
            await open(tocUrl);
            await popToRoot();
            setIsLoading(false);
          }
        } else {
          // Klappentext disabled - open content as before
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
                ? "Inhaltsverzeichnis & Inhaltstext"
                : urlsToOpen[0].endsWith(TOC_SUFFIX)
                  ? "Inhaltsverzeichnis"
                  : "Inhaltstext";
            await showHUD(`✓ ${contentDesc} geöffnet`);
          } else {
            await open(baseUrl);
            await toast.hide();
            await showToast({
              style: Toast.Style.Success,
              title: "Katalog-Eintrag geöffnet",
              message: "Keine digitalisierten Inhalte verfügbar",
            });
          }

          await popToRoot();
          setIsLoading(false);
        }
      } catch (error) {
        await toast.hide();
        const errorMessage = error instanceof Error ? error.message : "Ein unerwarteter Fehler ist aufgetreten";
        await showToast({
          style: Toast.Style.Failure,
          title: "Fehler",
          message: errorMessage,
        });
        console.error("DNB Content Viewer Error:", error);
        setIsLoading(false);
      }
    }

    runCommand();
  }, []);

  if (isLoading) {
    return <Detail isLoading={true} markdown="# Lade Buchinformationen..." />;
  }

  if (showDetail && result && bookInfo) {
    return (
      <KlappentextView
        result={result}
        tocUrl={bookInfo.tocUrl}
        isbn={normalizeISBN(isbn)}
        title={bookInfo.title}
        author={bookInfo.author}
      />
    );
  }

  return null;
}
