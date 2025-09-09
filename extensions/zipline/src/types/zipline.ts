export interface ZiplineFile {
  id: string;
  name: string;
  originalName?: string;
  type: string;
  url: string;
  createdAt: string;
  deletesAt?: string;
  views: number;
  maxViews?: number;
  size: number;
  favorite: boolean;
  password?: string;
}

export interface ZiplineUploadResponse {
  files: {
    id: string;
    type: string;
    url: string;
    pending?: boolean;
  }[];
  deletesAt?: string;
  assumedMimetypes?: boolean[];
  partialSuccess?: boolean;
  partialIdentifier?: string;
}

export interface ZiplineFilesResponse {
  files: ZiplineFile[];
  count: number;
  pages: number;
  page: number;
}

export interface ZiplineStats {
  size: number;
  count: number;
  views_count: number;
  users_count: number;
  avg_size: number;
}

export interface ZiplineUser {
  id: number;
  username: string;
  token: string;
  administrator: boolean;
  superAdmin: boolean;
  avatar?: string;
  embedColor?: string;
  ratelimit?: number;
  domains?: string[];
}

export interface ZiplineError {
  error: string;
  message: string;
  statusCode: number;
}

export interface ZiplinePreferences {
  ziplineUrl: string;
  apiToken: string;
  pageSize: string;
}

export interface UploadOptions {
  filename?: string;
  format?: "RANDOM" | "DATE" | "UUID" | "GFYCAT" | "NAME";
  overrideDomain?: string;
  originalName?: boolean;
  password?: string;
  embed?: boolean;
  maxViews?: number;
  expiresAt?: string;
  fileExtension?: string;
}

export interface FileFilterOptions {
  search?: string;
  mimetype?: string;
  favorite?: boolean;
  page?: number;
  limit?: number;
}
