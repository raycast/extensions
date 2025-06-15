// Type definitions for the search documentation
export interface Language {
  locale: string;
  name: string;
}

export interface Documentation {
  [locale: string]: {
    [section: string]: {
      [topic: string]: string;
    };
  };
}

// Type definitions for the deploy project
export interface CreateUploadSessionResponse {
  presign_url: string;
  presign_header: Record<string, string>;
  upload_id: string;
}

export interface PrepareUploadResponse {
  url: string;
}

export interface ErrorResponse {
  error: string;
}

// Type definitions for the zeabur graphql API
export interface Template {
  data: {
    templates: {
      edges: {
        node: TemplateInfo;
      }[];
    };
  };
}

export interface TemplateInfo {
  code: string;
  name: string;
  description: string;
  iconURL: string;
}
