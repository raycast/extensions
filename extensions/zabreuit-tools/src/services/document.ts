import { parseHTML } from "linkedom";

/** Reads the charset from the Content-Type header, falling back to a <meta> sniff. */
function detectCharset(contentType: string | null, bytes: Uint8Array): string {
  // A byte-order mark is authoritative: an outdated header or meta tag must not
  // override it, otherwise a UTF-8 page declared as windows-1252 gets corrupted.
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return "utf-8";
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return "utf-16le";
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return "utf-16be";
  }

  const fromHeader = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType ?? "")?.[1];
  if (fromHeader) {
    return fromHeader.toLowerCase();
  }

  const probe = new TextDecoder("latin1").decode(bytes.slice(0, 4096));
  const fromMeta =
    /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(probe)?.[1] ??
    /<meta[^>]+content\s*=\s*["'][^"']*charset\s*=\s*([\w-]+)/i.exec(probe)?.[1];
  return (fromMeta ?? "utf-8").toLowerCase();
}

function decodeBytes(bytes: Uint8Array, charset: string): string {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    // Unknown or unsupported label: fall back to UTF-8 rather than failing the command.
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/**
 * Fetches a page (or uses the provided HTML) and returns a DOM Document
 * usable by the extraction engines.
 *
 * Bytes are decoded using the page's declared charset so that non-UTF-8
 * pages (Windows-1252, ISO-8859-1, ...) keep their accents and symbols.
 */
export async function loadDocument(
  url: string,
  htmlOverride?: string,
): Promise<{ document: Document; html: string; finalUrl: string }> {
  let html = htmlOverride;
  let finalUrl = url;

  if (!html) {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status} for ${url}`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const charset = detectCharset(response.headers.get("content-type"), bytes);
    html = decodeBytes(bytes, charset);
    finalUrl = response.url || url;
  }

  const { document } = parseHTML(html) as unknown as { document: Document };
  return { document, html, finalUrl };
}
