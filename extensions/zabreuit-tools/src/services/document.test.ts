import { describe, it, expect, vi, afterEach } from "vitest";
import { loadDocument } from "./document.js";

function mockFetchOnce(body: Uint8Array | string, init: { status?: number; contentType?: string } = {}) {
  const status = init.status ?? 200;
  const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body;
  const response = {
    ok: status >= 200 && status < 300,
    status,
    url: "https://example.com/final",
    headers: new Headers(init.contentType ? { "content-type": init.contentType } : {}),
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  } as unknown as Response;

  const spy = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadDocument", () => {
  it("parses provided HTML without hitting the network", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);

    const { document, html, finalUrl } = await loadDocument(
      "https://example.com",
      "<html><head><title>Hola</title></head><body><h1>Hi</h1></body></html>",
    );

    expect(spy).not.toHaveBeenCalled();
    expect(document.title).toBe("Hola");
    expect(document.querySelector("h1")?.textContent).toBe("Hi");
    expect(html).toContain("<h1>Hi</h1>");
    expect(finalUrl).toBe("https://example.com");
  });

  it("returns the final URL after redirects", async () => {
    mockFetchOnce("<html><head><title>Moved</title></head></html>");
    const { finalUrl } = await loadDocument("https://example.com/start");
    expect(finalUrl).toBe("https://example.com/final");
  });

  it("throws on a non-2xx response instead of returning empty content", async () => {
    mockFetchOnce("nope", { status: 404 });
    await expect(loadDocument("https://example.com/missing")).rejects.toThrow(/status 404/);
  });

  it("decodes UTF-8 declared in the Content-Type header", async () => {
    mockFetchOnce("<html><head><title>Café</title></head></html>", {
      contentType: "text/html; charset=utf-8",
    });
    const { document } = await loadDocument("https://example.com");
    expect(document.querySelector("title")?.textContent).toBe("Café");
  });

  it("decodes a Windows-1252 page declared only in <meta charset>", async () => {
    // "Café" encoded in windows-1252: é = 0xE9 (invalid as a standalone UTF-8 byte)
    const html = '<html><head><meta charset="windows-1252"><title>Caf\u00e9</title></head></html>';
    const bytes = new Uint8Array([...html].map((char) => char.charCodeAt(0) & 0xff));

    mockFetchOnce(bytes, { contentType: "text/html" });

    const { document } = await loadDocument("https://example.com");
    expect(document.querySelector("title")?.textContent).toBe("Café");
  });

  it("prefers the UTF-8 BOM over a stale windows-1252 header", async () => {
    const html = '<html><head><meta charset="windows-1252"><title>Caf\u00e9</title></head></html>';
    const body = new TextEncoder().encode(html);
    const withBom = new Uint8Array(body.length + 3);
    withBom.set([0xef, 0xbb, 0xbf], 0);
    withBom.set(body, 3);

    mockFetchOnce(withBom, { contentType: "text/html; charset=windows-1252" });

    const { document } = await loadDocument("https://example.com");
    expect(document.querySelector("title")?.textContent).toBe("Café");
  });

  it("falls back to UTF-8 for an unknown charset label", async () => {
    mockFetchOnce("<html><head><title>Ok</title></head></html>", {
      contentType: "text/html; charset=x-unknown-charset",
    });
    const { document } = await loadDocument("https://example.com");
    expect(document.querySelector("title")?.textContent).toBe("Ok");
  });
});
