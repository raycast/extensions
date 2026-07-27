import { strFromU8, unzipSync } from "fflate";
import { LIMITS } from "./limits";

/**
 * Compact Office Open XML text sampler, following the same shape as the Zush
 * Drive worker: read only the parts that carry human-readable text, cap how much
 * is expanded, and never look at embedded media.
 */
export type OfficeKind = "document" | "presentation" | "spreadsheet";

const MAX_ARCHIVE_ENTRIES = 10_000;

export function officeKindForExtension(extension: string): OfficeKind | null {
  if (extension === ".docx") return "document";
  if (extension === ".pptx") return "presentation";
  if (extension === ".xlsx") return "spreadsheet";
  return null;
}

export function extractOfficeText(bytes: Uint8Array, kind: OfficeKind): string {
  const entries = readWantedParts(bytes, kind);

  if (Object.keys(entries).length === 0) {
    throw new Error("The file does not contain readable text parts.");
  }

  if (kind === "document") return documentText(entries);
  if (kind === "presentation") return presentationText(entries);
  return spreadsheetText(entries);
}

/**
 * Expands the parts `kind` reads, and nothing else.
 *
 * The size ceilings are applied from inside the filter because that is the last
 * point before anything is decompressed: `unzipSync` walks the central
 * directory, asks the filter about each entry, and inflates an accepted one into
 * a buffer sized from the very `originalSize` the filter was shown. Refusing
 * there is what keeps an oversized part from being allocated at all — a sum
 * taken after the call cannot, since by then the archive has already expanded
 * into memory.
 */
function readWantedParts(bytes: Uint8Array, kind: OfficeKind): Record<string, Uint8Array> {
  let seen = 0;
  let declared = 0;
  let tooManyEntries = false;
  let tooLarge = false;

  const entries = unzipSync(bytes, {
    filter: (file) => {
      // Every entry is counted, not just the wanted ones: the cost being capped
      // here is the archive's own size, and a container with a central
      // directory that large is not a document Zush is meant to sample.
      if ((seen += 1) > MAX_ARCHIVE_ENTRIES) {
        tooManyEntries = true;
        return false;
      }
      if (!wantedPath(file.name, kind)) return false;

      declared += file.originalSize;
      if (declared > LIMITS.maxOfficeExpandedBytes) {
        tooLarge = true;
        return false;
      }
      return true;
    },
  });

  // Thrown out here rather than from the filter, so fflate finishes its own walk
  // before the stack unwinds.
  if (tooManyEntries) {
    throw new Error("The file contains too many parts to sample.");
  }
  if (tooLarge) {
    throw new Error("The file expands to more data than Zush samples.");
  }

  // A local header may understate what it holds, so the declared sizes bound
  // what was allocated rather than what arrived. This re-reads the bytes that
  // actually came back, before a single one of them is parsed.
  let expanded = 0;
  for (const path of Object.keys(entries)) {
    expanded += entries[path].length;
    if (expanded > LIMITS.maxOfficeExpandedBytes) {
      throw new Error("The file expands to more data than Zush samples.");
    }
  }

  return entries;
}

function wantedPath(path: string, kind: OfficeKind): boolean {
  if (kind === "document") {
    return /^word\/(?:document|footnotes|endnotes)\.xml$/i.test(path);
  }
  if (kind === "presentation") {
    return /^ppt\/slides\/slide\d+\.xml$/i.test(path);
  }
  return /^xl\/(?:workbook\.xml|sharedStrings\.xml)$/i.test(path);
}

function documentText(entries: Record<string, Uint8Array>): string {
  const order = ["word/document.xml", "word/footnotes.xml", "word/endnotes.xml"];
  return order
    .map((path) => (entries[path] ? paragraphText(strFromU8(entries[path])) : ""))
    .filter(Boolean)
    .join("\n\n");
}

function presentationText(entries: Record<string, Uint8Array>): string {
  return Object.keys(entries)
    .sort((left, right) => slideNumber(left) - slideNumber(right))
    .slice(0, LIMITS.maxPresentationSlides)
    .map((path, index) => {
      const text = tagText(strFromU8(entries[path]), "a:t");
      return text ? `Slide ${index + 1}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function spreadsheetText(entries: Record<string, Uint8Array>): string {
  const sections: string[] = [];

  const workbook = entries["xl/workbook.xml"];
  if (workbook) {
    const names = [...strFromU8(workbook).matchAll(/<sheet\b[^>]*\bname="([^"]*)"/gi)]
      .map((match) => decodeXmlEntities(match[1]).trim())
      .filter(Boolean);
    if (names.length > 0) sections.push(`Sheets: ${names.join(", ")}`);
  }

  const sharedStrings = entries["xl/sharedStrings.xml"];
  if (sharedStrings) {
    const values = [...strFromU8(sharedStrings).matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)]
      .map((match) => decodeXmlEntities(match[1]).trim())
      .filter(Boolean)
      .slice(0, LIMITS.maxSpreadsheetStrings);
    if (values.length > 0) sections.push(`Cell values: ${values.join(" | ")}`);
  }

  return sections.join("\n");
}

function slideNumber(path: string): number {
  return Number(path.match(/slide(\d+)\.xml$/i)?.[1] ?? 0);
}

/** Word paragraphs become lines so headings and body text stay distinguishable. */
function paragraphText(xml: string): string {
  return collapseWhitespace(
    xml
      .replace(/<w:p\b[^>]*\/>/gi, "\n")
      .replace(/<\/w:p>/gi, "\n")
      .replace(/<w:tab\b[^>]*\/>/gi, "\t")
      .replace(/<w:br\b[^>]*\/>/gi, "\n"),
    true,
  );
}

function tagText(xml: string, tag: string): string {
  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  return collapseWhitespace([...xml.matchAll(pattern)].map((match) => match[1]).join(" "), false);
}

function collapseWhitespace(value: string, keepLines: boolean): string {
  const text = decodeXmlEntities(value.replace(/<[^>]*>/g, ""));
  if (!keepLines) return text.replace(/\s+/g, " ").trim();
  return text
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (match, code) => codePoint(Number(code)) ?? match)
    .replace(/&#x([0-9a-f]+);/gi, (match, code) => codePoint(Number.parseInt(code, 16)) ?? match)
    .replace(/&amp;/g, "&");
}

function codePoint(value: number): string | null {
  if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) return null;
  if (value >= 0xd800 && value <= 0xdfff) return null;
  return String.fromCodePoint(value);
}
