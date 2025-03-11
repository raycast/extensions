import { ZoteroItem, ZoteroCollection } from "../../types/zoteroItems";
import {
  ZoteroApiError,
  ZoteroAuthenticationError,
  ZoteroRateLimitError,
  ZoteroNotFoundError,
} from "./errors";
import { ZoteroSearchParams, ZoteroItemsResponse, ZoteroApiLinks } from "../../types/zoteroApi";
import {
  buildUserLibraryUrl,
  buildGroupLibraryUrl,
  buildSearchQueryString,
  ZOTERO_API_BASE_URL,
} from "./utils";
import * as https from "https";
import { URL } from "url";

/**
 * Simple HTTP client for making requests in Node.js environment
 * @param url The URL to fetch
 * @param options Request options
 * @returns Promise with response data
 */
function fetchWithNode(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<{
  status: number;
  statusText: string;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
  headers: Record<string, string>;
  ok: boolean;
}> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    console.log(
      `Making HTTP request to ${parsedUrl.hostname}${parsedUrl.pathname}${parsedUrl.search}`,
    );

    const req = https.request(requestOptions, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        const responseHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          if (value) {
            responseHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
          }
        }

        resolve({
          status: res.statusCode || 0,
          statusText: res.statusMessage || "",
          text: async () => data,
          json: async () => {
            try {
              return JSON.parse(data);
            } catch (e) {
              throw new Error(
                `Failed to parse JSON: ${e instanceof Error ? e.message : "Unknown error"}`,
              );
            }
          },
          headers: responseHeaders,
          ok: res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300,
        });
      });
    });

    req.on("error", (error) => {
      console.error("HTTP request error:", error.message);
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Default page size for paginated requests
 */
const DEFAULT_PAGE_SIZE = 50;

/**
 * Configuration options for ZoteroService
 */
export interface ZoteroServiceConfig {
  apiKey: string;
  userId?: string;
  groupId?: string;
}

// Singleton instance
let instance: ZoteroService | null = null;

/**
 * Service class for interacting with the Zotero API
 */
export class ZoteroService {
  private apiKey: string;
  private userId?: string;
  private groupId?: string;
  private isAuthenticated = false;
  private instanceId: string;
  private authPromise: Promise<boolean> | null = null;

  /**
   * Create a new Zotero API client
   * @param config The configuration options including API key and user/group IDs
   */
  constructor(config: ZoteroServiceConfig) {
    this.instanceId = Math.random().toString(36).substring(2, 9);
    console.log(`[${this.instanceId}] Constructor called with userId: ${config.userId}`);

    this.apiKey = config.apiKey;
    this.userId = config.userId;
    this.groupId = config.groupId;

    if (!this.apiKey) {
      throw new ZoteroAuthenticationError("API key is required");
    }

    if (!this.userId && !this.groupId) {
      throw new ZoteroApiError("Either userId or groupId must be provided");
    }
  }

  /**
   * Get singleton instance of the ZoteroService
   * @param config The configuration options
   * @returns Singleton instance of ZoteroService
   */
  public static getInstance(config: ZoteroServiceConfig): ZoteroService {
    console.log(
      `getInstance called with userId: ${config.userId}, current instance: ${instance ? "exists" : "null"}`,
    );

    if (!instance) {
      console.log("Creating new ZoteroService singleton instance");
      instance = new ZoteroService(config);
    } else if (
      instance.apiKey !== config.apiKey ||
      instance.userId !== config.userId ||
      instance.groupId !== config.groupId
    ) {
      // If configuration changed, create a new instance
      console.log("Configuration changed, recreating ZoteroService instance");
      instance = new ZoteroService(config);
    } else {
      console.log(`Reusing existing instance ${instance.instanceId}`);
    }
    return instance;
  }

  /**
   * Reset the singleton instance (mainly for testing)
   */
  public static resetInstance(): void {
    console.log("Resetting ZoteroService instance");
    instance = null;
  }

  /**
   * Authenticate with the Zotero API using the provided API key
   * @returns A promise that resolves when authentication is successful
   */
  public authenticate(): Promise<boolean> {
    if (this.authPromise) {
      return this.authPromise;
    }

    this.authPromise = new Promise((resolve, reject) => {
      const doAuthentication = async () => {
        try {
          if (!this.userId) {
            console.log(`[${this.instanceId}] No user ID provided`);
            reject(new ZoteroAuthenticationError("User ID is required"));
            return;
          }

          console.log(
            `[${this.instanceId}] Attempting to authenticate with user ID: ${this.userId}`,
          );
          const url = `${ZOTERO_API_BASE_URL}/users/${this.userId}/items/top?limit=1&key=${this.apiKey}`;

          const response = await fetchWithNode(url, {
            method: "GET",
            headers: {
              "Zotero-API-Version": "3",
              "Content-Type": "application/json",
            },
          });

          console.log(`[${this.instanceId}] Authentication response status: ${response.status}`);
          const responseText = await response.text();

          if (!response.ok) {
            console.log(
              `[${this.instanceId}] Authentication failed with status ${response.status}`,
            );
            this.isAuthenticated = false;

            if (response.status === 401) {
              throw new ZoteroAuthenticationError(
                `Authentication failed: Invalid API key. Please verify your API key in preferences.`,
              );
            }

            if (response.status === 403) {
              throw new ZoteroAuthenticationError(
                `Authentication failed: Insufficient permissions. Make sure "Allow library access" is enabled for your API key.`,
              );
            }

            if (response.status === 404) {
              throw new ZoteroAuthenticationError(
                `Authentication failed: User ID ${this.userId} not found. Please verify your user ID in preferences.`,
              );
            }

            throw new ZoteroApiError(
              `Authentication failed (${response.status}): ${response.statusText}\nResponse: ${responseText}`,
            );
          }

          // Try to parse the response to ensure it's valid JSON
          try {
            const data = JSON.parse(responseText);
            console.log(`[${this.instanceId}] Successfully parsed response`);

            if (!Array.isArray(data) || data.length === 0) {
              console.log(`[${this.instanceId}] Response not a non-empty array`);
              throw new Error("Expected non-empty array response");
            }

            // Verify the response contains the expected user ID
            const firstItem = data[0];
            if (!firstItem.library || firstItem.library.id !== parseInt(this.userId)) {
              console.log(`[${this.instanceId}] User ID mismatch in response`);
              throw new Error("Response user ID does not match");
            }
          } catch (error: unknown) {
            console.log(
              `[${this.instanceId}] Error parsing response: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
            this.isAuthenticated = false;
            throw new ZoteroApiError(
              `Invalid response from Zotero API: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }

          this.isAuthenticated = true;
          console.log(`[${this.instanceId}] Authentication successful!`);
          resolve(true);
        } catch (error: unknown) {
          console.log(
            `[${this.instanceId}] Authentication error: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
          this.isAuthenticated = false;
          if (error instanceof ZoteroApiError) {
            reject(error);
          } else {
            reject(
              new ZoteroApiError(
                `Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              ),
            );
          }
        } finally {
          this.authPromise = null;
        }
      };

      // Start the authentication process
      doAuthentication();
    });

    return this.authPromise;
  }

  /**
   * Get the user's library items with pagination support
   * @param params Optional search parameters including pagination
   * @returns A promise that resolves to an array of Zotero items
   */
  public async getUserLibrary(params: ZoteroSearchParams = {}): Promise<ZoteroItem[]> {
    try {
      if (!this.isAuthenticated) {
        await this.authenticate();
      }

      const items: ZoteroItem[] = [];
      let currentUrl: string | undefined = this.buildLibraryUrl();

      // Add search parameters to URL
      const queryString = buildSearchQueryString({
        ...params,
        limit: params.limit || DEFAULT_PAGE_SIZE,
      });

      if (queryString) {
        currentUrl += `?${queryString}`;
      }

      console.log(`Starting request with URL: ${currentUrl}`);

      while (currentUrl) {
        console.log(`Fetching URL: ${currentUrl}`);
        const response = await this.makeRequest<ZoteroItemsResponse>(currentUrl);

        // Safely extract data - handle potential undefined/null data
        if (response && response.data && Array.isArray(response.data)) {
          console.log(`Adding ${response.data.length} items from response`);

          // Process each item to ensure it has the correct structure
          const processedItems = response.data
            .map((item) => {
              // If item doesn't have expected structure, skip it
              if (!item || typeof item !== "object") {
                console.warn("Skipping invalid item:", item);
                return null;
              }

              // Deep clone just to be safe and prevent unintended mutations
              const normalizedItem: ZoteroItem = {
                key: item.key,
                version: item.version,
                library: item.library,
                links: item.links,
                meta: item.meta,
                data: item.data, // Just pass through the data directly
              };

              // Add detailed logging for a complete debugging picture
              console.log("ITEM DATA DEBUG:");
              console.log("- Item key:", normalizedItem.key);
              console.log("- Data exists:", !!normalizedItem.data);
              if (normalizedItem.data) {
                console.log("- Title:", normalizedItem.data.title);
                console.log("- Creator count:", normalizedItem.data.creators?.length || 0);
                if (normalizedItem.data.creators && normalizedItem.data.creators.length > 0) {
                  console.log("- First creator:", JSON.stringify(normalizedItem.data.creators[0]));
                }
                console.log("- Date:", normalizedItem.data.date);
                console.log("- Item type:", normalizedItem.data.itemType);
              }

              return normalizedItem;
            })
            .filter(Boolean) as ZoteroItem[]; // Remove any null items

          items.push(...processedItems);
        } else {
          console.warn("Response data is not an array or is missing");
        }

        // Check if there's a next page
        currentUrl = this.getNextPageUrl(response?.links);
        console.log(`Next page URL: ${currentUrl || "none"}`);

        // If we have a limit and we've reached it, stop
        if (params.limit && items.length >= params.limit) {
          console.log(`Reached limit of ${params.limit} items, trimming`);
          items.splice(params.limit); // Trim to exact limit
          break;
        }
      }

      console.log(`Returning ${items.length} total items`);

      // Add one more debug before returning
      if (items.length > 0) {
        console.log(
          "First returned item structure:",
          JSON.stringify(items[0]).substring(0, 500) + "...",
        );
      }

      return items;
    } catch (error) {
      console.error("Error in getUserLibrary:", error);

      // If we get an authentication error, try to re-authenticate once
      if (error instanceof ZoteroAuthenticationError) {
        console.log("Authentication error, trying to re-authenticate");
        this.isAuthenticated = false;
        await this.authenticate();
        return this.getUserLibrary(params);
      }

      throw this.handleError(error);
    }
  }

  /**
   * Search for items matching the query
   * @param query The search query string
   * @param params Additional search parameters
   * @returns A promise that resolves to an array of matching Zotero items
   */
  public async searchItems(
    query: string,
    params: Omit<ZoteroSearchParams, "q"> = {},
  ): Promise<ZoteroItem[]> {
    return this.getUserLibrary({
      ...params,
      q: query,
      qmode: params.qmode || "everything",
    });
  }

  /**
   * Make an authenticated request to the Zotero API
   * @param url The API endpoint URL
   * @returns A promise that resolves to the API response
   */
  private async makeRequest<T>(url: string): Promise<T> {
    try {
      const response = await fetchWithNode(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        switch (response.status) {
          case 401:
            throw new ZoteroAuthenticationError();
          case 404:
            throw new ZoteroNotFoundError();
          case 429:
            throw new ZoteroRateLimitError();
          default:
            throw new ZoteroApiError(`API request failed: ${response.statusText}`, response.status);
        }
      }

      // Get response text first for debugging
      const responseText = await response.text();
      console.log(`Raw API response (first 300 chars): ${responseText.substring(0, 300)}...`);

      // Parse the JSON manually
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse JSON response:", e);
        throw new ZoteroApiError(
          `Invalid JSON response: ${e instanceof Error ? e.message : "Unknown error"}`,
        );
      }

      console.log(`Response type: ${Array.isArray(responseData) ? "Array" : typeof responseData}`);
      if (typeof responseData === "object" && responseData) {
        console.log(`Has data property: ${responseData && "data" in responseData}`);
      }

      // Detailed debug of the first item if it's an array
      if (Array.isArray(responseData) && responseData.length > 0) {
        console.log(
          "First item in response:",
          JSON.stringify(responseData[0]).substring(0, 500) + "...",
        );
      }

      // Inside makeRequest method after parsing responseData
      console.log(
        "Raw API response structure:",
        JSON.stringify(responseData, null, 2).substring(0, 500) + "...",
      );

      // Now transform based on what we received
      let transformed: Record<string, unknown> = {
        data: [],
        links: {},
        meta: { numResults: 0 },
      };

      if (Array.isArray(responseData)) {
        console.log(`Transforming array of ${responseData.length} items into data structure`);
        // Convert to expected format with data property
        transformed = {
          data: responseData,
          links: this.parseLinkHeader(response.headers.link),
          meta: {
            numResults: responseData.length,
          },
        };
      } else if (responseData && typeof responseData === "object") {
        if ("data" in responseData && Array.isArray(responseData.data)) {
          // Already has a data property that's an array, use as is
          console.log("Response already has data array property");
          transformed = responseData;
        } else {
          // Object without a data property or with non-array data
          console.log("Wrapping object in data array property");
          transformed = {
            data:
              "data" in responseData
                ? responseData.data !== null
                  ? Array.isArray(responseData.data)
                    ? responseData.data
                    : [responseData.data]
                  : [responseData.data]
                : [responseData],
            links:
              "links" in responseData
                ? responseData.links
                : this.parseLinkHeader(response.headers.link),
            meta: "meta" in responseData ? responseData.meta : { numResults: 1 },
          };
        }
      } else {
        // Primitive value or null - this shouldn't normally happen
        console.error("Unexpected response type:", responseData);
        transformed = {
          data: [],
          links: {},
          meta: { numResults: 0 },
        };
      }

      // Ensure data property exists and is array
      if (!transformed.data || !Array.isArray(transformed.data)) {
        console.error("Transformed response data is not an array:", transformed);
        transformed.data = [];
      }

      // Ensure transformed.data is properly typed
      const transformedData = transformed.data as unknown[];
      console.log(`Transformed response has ${transformedData.length} items in data array`);

      return transformed as T;
    } catch (error) {
      console.error("Error in makeRequest:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Add new helper method to parse link headers
   * @param linkHeader The Link header from the API response
   * @returns Parsed links object
   */
  private parseLinkHeader(linkHeader?: string): ZoteroApiLinks {
    const links: ZoteroApiLinks = {
      self: { href: "...", type: "application/json" },
    };
    if (!linkHeader) return links;

    const parts = linkHeader.split(",");
    for (const part of parts) {
      const section = part.split(";");
      if (section.length < 2) continue;

      const urlMatch = section[0].match(/<(.+)>/);
      const relMatch = section[1].match(/rel="?([^"]+)"?/);

      if (urlMatch && relMatch) {
        const url = urlMatch[1];
        const rel = relMatch[1];
        links[rel as keyof ZoteroApiLinks] = {
          href: url,
          type: "application/json",
        };
      }
    }
    return links;
  }

  /**
   * Get the next page URL from the API response links
   * @param links The links object from the API response
   * @returns The next page URL or undefined if there is no next page
   */
  private getNextPageUrl(links?: ZoteroApiLinks): string | undefined {
    return links?.next?.href;
  }

  /**
   * Build the base library URL based on user or group ID
   * @returns The base library URL
   */
  private buildLibraryUrl(): string {
    if (this.userId) {
      return buildUserLibraryUrl(this.userId);
    }
    if (this.groupId) {
      return buildGroupLibraryUrl(this.groupId);
    }
    throw new ZoteroApiError("No user or group ID configured");
  }

  /**
   * Get the headers required for API requests
   * @returns Headers object with authentication and content type
   */
  private getHeaders(): Record<string, string> {
    const headers = {
      "Zotero-API-Version": "3",
      "Zotero-API-Key": this.apiKey,
      "Content-Type": "application/json",
    };
    console.log("Request headers:", headers);
    return headers;
  }

  /**
   * Handle API errors and convert them to appropriate error types
   * @param error The error to handle
   * @returns A new error with appropriate type and message
   */
  private handleError(error: unknown): Error {
    if (error instanceof ZoteroApiError) {
      return error;
    }

    if (typeof error === "object" && error !== null && "status" in error) {
      const status = (error as { status: number }).status;

      if (status === 401) {
        return new ZoteroAuthenticationError();
      }
      if (status === 404) {
        return new ZoteroNotFoundError();
      }
      if (status === 429) {
        return new ZoteroRateLimitError();
      }
    }

    return new ZoteroApiError(error instanceof Error ? error.message : "An unknown error occurred");
  }

  /**
   * Ensure that the client is authenticated
   * @throws ZoteroAuthenticationError if not authenticated
   */
  private ensureAuthenticated(): void {
    if (!this.isAuthenticated) {
      throw new ZoteroAuthenticationError("Not authenticated. Call authenticate() first.");
    }
  }
}

export type ZoteroResponse<T> = {
  status: number;
  data: T;
  headers?: Record<string, string>;
};

export type ZoteroDataType = ZoteroItem | ZoteroCollection | unknown;
