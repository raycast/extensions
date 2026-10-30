import {
  AIMarkdownEngine,
  EcommerceJsonLdEngine,
  TechnicalAuditorEngine,
  B2BEnricherEngine,
} from "../vendor/core.js";
import { loadDocument } from "./document.js";
import type { ScrapeResult, SeoAuditResult, B2bContactResult } from "../types.js";

export class EngineBridge {
  private markdownEngine = new AIMarkdownEngine();
  private ecommerceEngine = new EcommerceJsonLdEngine();
  private auditEngine = new TechnicalAuditorEngine();
  private b2bEngine = new B2BEnricherEngine();

  async scrapeUrl(url: string, htmlOverride?: string): Promise<ScrapeResult> {
    const { document, finalUrl } = await loadDocument(url, htmlOverride);

    const mdRes = await this.markdownEngine.extract({ document, url: finalUrl });
    if (!mdRes?.success || !mdRes.data) {
      throw new Error(mdRes?.error?.message || "Could not extract content from the page");
    }

    let jsonLdData: Record<string, unknown> | undefined;
    try {
      const ecomRes = await this.ecommerceEngine.extract({ document, url: finalUrl });
      if (ecomRes?.success && ecomRes.data && ecomRes.data.length > 0) {
        jsonLdData = ecomRes.data[0] as unknown as Record<string, unknown>;
      }
    } catch {
      // JSON-LD is optional: many pages simply do not publish structured data
    }

    const markdown: string = mdRes.data.markdown || "";
    const cleanText = markdown
      .replace(/[#*`_[\]()]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return {
      url: finalUrl,
      title: mdRes.data.title || finalUrl,
      markdown,
      cleanText,
      jsonLd: jsonLdData,
    };
  }

  async auditSeo(url: string, htmlOverride?: string): Promise<SeoAuditResult> {
    const { document, finalUrl } = await loadDocument(url, htmlOverride);

    // Headers are not audited: the engine issues its own HEAD request and does not
    // check whether it succeeded, so a 403/405 would be reported as missing security
    // headers and would wrongly lower the score.
    const res = await this.auditEngine.extract({
      document,
      url: finalUrl,
      checkPerformance: false,
      fetchHeadHeaders: false,
    });
    if (!res?.success || !res.data) {
      throw new Error(res?.error?.message || "Could not audit the page");
    }

    const meta = res.data.meta ?? {};
    const openGraph = meta.openGraph ?? { missingRequiredTags: [] };
    const missingTags: string[] = openGraph.missingRequiredTags ?? [];

    return {
      url: finalUrl,
      complianceScore: res.data.complianceScore ?? 0,
      title: meta.title || openGraph.title,
      description: meta.description || openGraph.description,
      openGraphValid: missingTags.length === 0,
      missingTags,
      issues: (res.data.issues ?? []).map((issue) => issue.message || issue.code),
    };
  }

  async extractB2b(
    url: string,
    htmlOverride?: string,
    resolveDns = false,
  ): Promise<B2bContactResult> {
    const { document, finalUrl } = await loadDocument(url, htmlOverride);

    const res = await this.b2bEngine.extract({
      document,
      url: finalUrl,
      resolveDns,
    });
    if (!res?.success || !res.data) {
      throw new Error(res?.error?.message || "Could not extract company information");
    }

    const data = res.data;
    const socialLinks: Record<string, string> = {};
    for (const [key, value] of Object.entries(data.socialLinks ?? {})) {
      if (typeof value === "string" && value.length > 0) {
        socialLinks[key] = value;
      }
    }

    return {
      url: finalUrl,
      companyName: data.companyName || "",
      domain: data.domain || "",
      emails: data.emails || [],
      phones: data.phoneNumbers || [],
      technologies: data.technologies || [],
      socialLinks,
    };
  }
}
