import { parseHTML } from "linkedom";

/**
 * Fetches a page (or uses the provided HTML) and returns a DOM Document
 * usable by the extraction engines.
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
    html = await response.text();
    finalUrl = response.url || url;
  }

  const { document } = parseHTML(html) as unknown as { document: Document };
  return { document, html, finalUrl };
}
