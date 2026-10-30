import { describe, it, expect, vi, afterEach } from "vitest";
import { EngineBridge } from "./engine-bridge.js";

type AnyBridge = {
  auditEngine: { extract: (options: Record<string, unknown>) => Promise<unknown> };
  markdownEngine: { extract: (options: Record<string, unknown>) => Promise<unknown> };
};

function mockFetchHtml(html: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: "https://example.com/",
      headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
      arrayBuffer: async () => new TextEncoder().encode(html).buffer,
    } as unknown as Response),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EngineBridge.auditSeo", () => {
  it("passes a real DOM document to the engine", async () => {
    mockFetchHtml('<html><head><title>Page</title></head><body></body></html>');
    const bridge = new EngineBridge();
    const seen: Record<string, unknown>[] = [];

    (bridge as unknown as AnyBridge).auditEngine = {
      extract: async (options) => {
        seen.push(options);
        return {
          success: true,
          data: {
            complianceScore: 90,
            meta: { title: "Page", description: "Desc", openGraph: { missingRequiredTags: [] } },
            issues: [],
          },
        };
      },
    };

    const result = await bridge.auditSeo("https://example.com");

    expect(seen).toHaveLength(1);
    expect(seen[0].document).toBeDefined();
    expect((seen[0].document as Document).querySelector("title")?.textContent).toBe("Page");
    expect(result.complianceScore).toBe(90);
  });

  it("does not request HEAD headers (avoids false missing-header findings)", async () => {
    mockFetchHtml("<html><head><title>Page</title></head></html>");
    const bridge = new EngineBridge();
    const seen: Record<string, unknown>[] = [];

    (bridge as unknown as AnyBridge).auditEngine = {
      extract: async (options) => {
        seen.push(options);
        return { success: true, data: { complianceScore: 100, meta: {}, issues: [] } };
      },
    };

    await bridge.auditSeo("https://example.com");

    expect(seen[0].fetchHeadHeaders).toBe(false);
  });

  it("marks OpenGraph valid only when no required tags are missing", async () => {
    mockFetchHtml("<html><head><title>Page</title></head></html>");
    const bridge = new EngineBridge();

    (bridge as unknown as AnyBridge).auditEngine = {
      extract: async () => ({
        success: true,
        data: {
          complianceScore: 70,
          meta: {
            title: "Page",
            description: "Desc",
            openGraph: { title: "OG", description: "OGD", missingRequiredTags: ["og:image"] },
          },
          issues: [{ code: "OG_MISSING", message: "Missing og:image" }],
        },
      }),
    };

    const result = await bridge.auditSeo("https://example.com");

    expect(result.openGraphValid).toBe(false);
    expect(result.missingTags).toEqual(["og:image"]);
    expect(result.title).toBe("Page");
    expect(result.description).toBe("Desc");
    expect(result.issues).toEqual(["Missing og:image"]);
  });

  it("surfaces engine failures instead of returning empty results", async () => {
    mockFetchHtml("<html><head><title>Page</title></head></html>");
    const bridge = new EngineBridge();

    (bridge as unknown as AnyBridge).auditEngine = {
      extract: async () => ({ success: false, error: { message: "No DOM document available" } }),
    };

    await expect(bridge.auditSeo("https://example.com")).rejects.toThrow(/No DOM document available/);
  });
});

describe("EngineBridge.scrapeUrl", () => {
  it("returns markdown, clean text and the final URL", async () => {
    mockFetchHtml("<html><head><title>Page</title></head><body><p>hello</p></body></html>");
    const bridge = new EngineBridge();

    (bridge as unknown as AnyBridge).markdownEngine = {
      extract: async () => ({ success: true, data: { title: "Page", markdown: "# Page\n\nhello" } }),
    };

    const result = await bridge.scrapeUrl("https://example.com");

    expect(result.title).toBe("Page");
    expect(result.markdown).toContain("hello");
    expect(result.cleanText).toBe("Page hello");
    expect(result.url).toBe("https://example.com/");
  });

  it("throws when the extraction engine fails", async () => {
    mockFetchHtml("<html><head><title>Page</title></head></html>");
    const bridge = new EngineBridge();

    (bridge as unknown as AnyBridge).markdownEngine = {
      extract: async () => ({ success: false, error: { message: "EXTRA_EMPTY_TARGET" } }),
    };

    await expect(bridge.scrapeUrl("https://example.com")).rejects.toThrow(/EXTRA_EMPTY_TARGET/);
  });
});
