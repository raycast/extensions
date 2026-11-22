const MAX_BYTES = 5 * 1024 * 1024;
export class SourceError extends Error {
  constructor(
    message: string,
    readonly retryAt = 0,
  ) {
    super(message);
  }
}
export type HttpResult =
  { status: "unchanged" } | { status: "ok"; body: string; etag: string | null; lastModified: string | null };
export function retryAfter(value: string | null, now: number): number {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return now + seconds * 1000;
  return Math.max(0, Date.parse(value) || 0);
}
export async function getDocument(
  url: string,
  validators: { etag: string | null; lastModified: string | null } | null = null,
  fetcher: typeof fetch = fetch,
): Promise<HttpResult> {
  const headers: Record<string, string> = {
    Accept: url.endsWith("/rss") ? "application/rss+xml, application/xml, text/xml" : "text/html",
  };
  if (validators?.etag) headers["If-None-Match"] = validators.etag;
  if (validators?.lastModified) headers["If-Modified-Since"] = validators.lastModified;
  const response = await fetcher(url, { headers, signal: AbortSignal.timeout(15000), redirect: "error" });
  if (response.status === 304) return { status: "unchanged" };
  if (!response.ok) {
    await response.body?.cancel();
    const message =
      response.headers.get("cf-mitigated") === "challenge"
        ? "Cloudflare is challenging direct requests. Open Zero Wire in your browser. Cached content is retained."
        : `Zero Wire returned HTTP ${response.status}. Cached content is retained.`;
    throw new SourceError(message, retryAfter(response.headers.get("retry-after"), Date.now()));
  }
  const mime = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  const allowed = url.endsWith("/rss") ? ["application/rss+xml", "application/xml", "text/xml"] : ["text/html"];
  if (!mime || !allowed.includes(mime)) {
    await response.body?.cancel();
    throw new SourceError("Zero Wire returned an unexpected content type");
  }
  if (Number(response.headers.get("content-length")) > MAX_BYTES) {
    await response.body?.cancel();
    throw new SourceError("Zero Wire response exceeded 5 MiB");
  }
  if (!response.body) throw new SourceError("Zero Wire returned an empty response");
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let html = "",
    length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > MAX_BYTES) throw new SourceError("Zero Wire response exceeded 5 MiB");
      html += decoder.decode(part.value, { stream: true });
    }
    html += decoder.decode();
  } finally {
    await reader.cancel();
  }
  return {
    status: "ok",
    body: html,
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified"),
  };
}
