import {
  AIMarkdownEngine,
  EcommerceJsonLdEngine,
  TechnicalAuditorEngine,
  B2BEnricherEngine,
} from '../vendor/core.js';
import type { ScrapeResult, SeoAuditResult, B2bContactResult } from '../types.js';

export class EngineBridge {
  private markdownEngine = new AIMarkdownEngine();
  private ecommerceEngine = new EcommerceJsonLdEngine();
  private auditEngine = new TechnicalAuditorEngine();
  private b2bEngine = new B2BEnricherEngine();

  async scrapeUrl(url: string, htmlOverride?: string): Promise<ScrapeResult> {
    const mdRes = await this.markdownEngine.extract(url, {
      url,
      html: htmlOverride,
    });

    let jsonLdData: Record<string, unknown> | undefined = undefined;
    try {
      const ecomRes = await this.ecommerceEngine.extract(url, {
        url,
        html: htmlOverride,
      });
      if (ecomRes.success && ecomRes.data && ecomRes.data.length > 0) {
        jsonLdData = ecomRes.data[0] as unknown as Record<string, unknown>;
      }
    } catch {
      // jsonld optional
    }

    const markdown = mdRes.data?.markdown || '';
    const cleanText = markdown
      ? markdown.replace(/[#*`_\[\]()]/g, '').replace(/\s+/g, ' ').trim()
      : '';

    return {
      url,
      title: mdRes.data?.title || url,
      markdown,
      cleanText,
      jsonLd: jsonLdData,
    };
  }

  async auditSeo(url: string, htmlOverride?: string): Promise<SeoAuditResult> {
    const res = await this.auditEngine.extract(url, {
      url,
      html: htmlOverride,
      checkSsl: false,
      checkSecurityTxt: false,
      checkRobotsTxt: false,
      checkRdap: false,
    });

    const report = res.data;
    return {
      url,
      complianceScore: report?.complianceScore ?? 0,
      title: report?.openGraph?.title,
      description: report?.openGraph?.description,
      openGraphValid: report?.openGraph?.valid ?? false,
      missingTags: report?.openGraph?.missingRequiredTags || [],
      issues: (report?.issues || []).map((i) => i.message || i.code),
    };
  }

  async extractB2b(
    url: string,
    htmlOverride?: string,
    resolveDns = false,
  ): Promise<B2bContactResult> {
    const res = await this.b2bEngine.extract(url, {
      url,
      html: htmlOverride,
      resolveDns,
    });

    const data = res.data;
    const socialLinks: Record<string, string> = {};
    if (data?.socialLinks) {
      for (const [key, val] of Object.entries(data.socialLinks)) {
        if (typeof val === 'string' && val.length > 0) {
          socialLinks[key] = val;
        }
      }
    }

    return {
      url,
      companyName: data?.companyName || '',
      domain: data?.domain || '',
      emails: data?.emails || [],
      phones: data?.phoneNumbers || [],
      technologies: data?.technologies || [],
      socialLinks,
    };
  }
}
