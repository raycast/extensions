import fetch, { RequestInit } from "node-fetch";
import fs from "fs";
import FormData from "form-data";
import {
  ZiplineFile,
  ZiplineUploadResponse,
  ZiplineStats,
  ZiplineUser,
  ZiplineError,
  UploadOptions,
  FileFilterOptions,
} from "../types/zipline";

export class ZiplineAPI {
  public baseUrl: string;
  public apiToken: string;

  constructor(baseUrl: string, apiToken: string) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    this.apiToken = apiToken;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      Authorization: this.apiToken,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = (await response.json()) as ZiplineError;
        errorMessage =
          errorData.message ||
          errorData.error ||
          `HTTP ${response.status}: ${response.statusText}`;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  async getUserFiles(options: FileFilterOptions = {}): Promise<{
    page: ZiplineFile[];
    count: number;
    pages: number;
    currentPage: number;
  }> {
    const params = new URLSearchParams();

    if (options.search) params.append("filter", options.search);
    if (options.mimetype) params.append("mimetype", options.mimetype);
    if (options.favorite !== undefined)
      params.append("favorite", options.favorite.toString());

    // Page parameter is required
    params.append("page", (options.page || 1).toString());

    const endpoint = `/api/user/files?${params.toString()}`;

    const response = await this.makeRequest<{
      page: ZiplineFile[];
      count: number;
      pages: number;
      currentPage: number;
    }>(endpoint);
    return {
      page: response.page || [],
      count: response.count || 0,
      pages: response.pages || 1,
      currentPage: options.page || 1,
    };
  }

  async uploadFile(
    filePath: string,
    fileName: string,
    options: Partial<UploadOptions> = {},
  ): Promise<ZiplineUploadResponse> {
    // Check if file exists and has content
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const fileStats = fs.statSync(filePath);

    if (fileStats.size === 0) {
      throw new Error(`File is empty: ${filePath}`);
    }

    const formData = new FormData();
    const fileBuffer = fs.readFileSync(filePath);

    // Determine MIME type from filename or file extension
    let mimeType = "application/octet-stream";
    const fileExtension =
      options.fileExtension || fileName.split(".").pop()?.toLowerCase();

    if (fileExtension) {
      const mimeTypes: Record<string, string> = {
        // Text files
        txt: "text/plain",
        md: "text/markdown",
        js: "text/javascript",
        ts: "text/typescript",
        json: "application/json",
        html: "text/html",
        css: "text/css",
        py: "text/x-python",
        sql: "text/x-sql",
        xml: "text/xml",

        // Image files
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        svg: "image/svg+xml",
        bmp: "image/bmp",
        ico: "image/x-icon",

        // Audio files
        mp3: "audio/mpeg",
        wav: "audio/wav",
        ogg: "audio/ogg",
        m4a: "audio/mp4",
        flac: "audio/flac",

        // Video files
        mp4: "video/mp4",
        webm: "video/webm",
        avi: "video/x-msvideo",
        mov: "video/quicktime",
        wmv: "video/x-ms-wmv",
        flv: "video/x-flv",

        // Document files
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ppt: "application/vnd.ms-powerpoint",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",

        // Archive files
        zip: "application/zip",
        rar: "application/x-rar-compressed",
        "7z": "application/x-7z-compressed",
        tar: "application/x-tar",
        gz: "application/gzip",

        // Other common types
        epub: "application/epub+zip",
        exe: "application/octet-stream",
        deb: "application/x-deb",
        dmg: "application/x-apple-diskimage",
        iso: "application/x-iso9660-image",
      };
      mimeType = mimeTypes[fileExtension] || "application/octet-stream";
    }

    formData.append("file", fileBuffer, {
      filename: fileName,
      contentType: mimeType,
    });

    const headers: Record<string, string> = {
      Authorization: this.apiToken,
      ...formData.getHeaders(),
    };

    if (options.format)
      headers["x-zipline-format"] = options.format.toLowerCase();
    if (options.overrideDomain)
      headers["x-zipline-domain"] = options.overrideDomain;
    if (options.originalName) headers["x-zipline-original-name"] = "true";
    if (options.password) headers["x-zipline-password"] = options.password;
    if (options.maxViews)
      headers["x-zipline-max-views"] = options.maxViews.toString();
    if (options.expiresAt) headers["x-zipline-deletes-at"] = options.expiresAt;
    if (options.filename) headers["x-zipline-filename"] = options.filename;
    if (options.fileExtension)
      headers["x-zipline-file-extension"] = options.fileExtension;

    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    const responseData = await response.json();
    return responseData as ZiplineUploadResponse;
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.makeRequest(`/api/user/files/${fileId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        delete: "file",
        id: fileId,
      }),
    });
  }

  async toggleFileFavorite(fileId: string): Promise<void> {
    await this.makeRequest(`/api/user/files/${fileId}/favorite`, {
      method: "PATCH",
    });
  }

  async getFileById(fileId: string): Promise<ZiplineFile> {
    return this.makeRequest<ZiplineFile>(`/api/user/files/${fileId}`);
  }

  async getUserStats(): Promise<ZiplineStats> {
    return this.makeRequest<ZiplineStats>("/api/user/stats");
  }

  async getCurrentUser(): Promise<ZiplineUser> {
    return this.makeRequest<ZiplineUser>("/api/user");
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }
}
