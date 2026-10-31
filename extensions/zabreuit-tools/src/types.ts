export interface RaycastPreferences {
  licenseKey?: string;
  defaultFormat?: 'markdown' | 'json' | 'html';
}

export interface ScrapeResult {
  url: string;
  title: string;
  markdown: string;
  cleanText: string;
  jsonLd?: Record<string, unknown>;
}

export interface SeoAuditResult {
  url: string;
  complianceScore: number;
  title?: string;
  description?: string;
  openGraphValid: boolean;
  missingTags: string[];
  issues: string[];
}

export interface B2bContactResult {
  url: string;
  companyName: string;
  domain: string;
  emails: string[];
  phones: string[];
  technologies: string[];
  socialLinks: Record<string, string>;
}
