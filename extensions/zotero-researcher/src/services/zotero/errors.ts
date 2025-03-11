/**
 * Custom error classes for Zotero API service
 */

export class ZoteroApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = "ZoteroApiError";
    this.statusCode = statusCode;
  }
}

export class ZoteroAuthenticationError extends ZoteroApiError {
  constructor(message: string = "Authentication failed. Check your API key.") {
    super(message, 401);
    this.name = "ZoteroAuthenticationError";
  }
}

export class ZoteroRateLimitError extends ZoteroApiError {
  constructor(message: string = "Rate limit exceeded. Please try again later.") {
    super(message, 429);
    this.name = "ZoteroRateLimitError";
  }
}

export class ZoteroNotFoundError extends ZoteroApiError {
  constructor(message: string = "Resource not found.") {
    super(message, 404);
    this.name = "ZoteroNotFoundError";
  }
}

/**
 * Utility function to handle API errors based on status code
 */
export function handleZoteroApiError(statusCode: number, message?: string): never {
  switch (statusCode) {
    case 401:
      throw new ZoteroAuthenticationError(message);
    case 404:
      throw new ZoteroNotFoundError(message);
    case 429:
      throw new ZoteroRateLimitError(message);
    default:
      throw new ZoteroApiError(
        message || `API request failed with status ${statusCode}`,
        statusCode,
      );
  }
}
