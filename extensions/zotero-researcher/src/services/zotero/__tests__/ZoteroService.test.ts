import { ZoteroService, ZoteroServiceConfig } from "../ZoteroService";
import { ZoteroApiError, ZoteroAuthenticationError, ZoteroRateLimitError } from "../errors";
import { ZoteroJournalArticle } from "../../../types/zoteroItems";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("ZoteroService", () => {
  const validConfig: ZoteroServiceConfig = {
    apiKey: "test-api-key",
    userId: "test-user-id",
  };

  let service: ZoteroService;

  beforeEach(() => {
    service = new ZoteroService(validConfig);
    mockFetch.mockClear();
  });

  describe("constructor", () => {
    it("should create a service with valid config", () => {
      expect(service).toBeInstanceOf(ZoteroService);
    });

    it("should throw an error if API key is missing", () => {
      expect(() => {
        new ZoteroService({
          ...validConfig,
          apiKey: "",
        });
      }).toThrow(ZoteroAuthenticationError);
    });

    it("should throw an error if both userId and groupId are missing", () => {
      expect(() => {
        new ZoteroService({
          apiKey: "test-api-key",
        });
      }).toThrow(ZoteroApiError);
    });
  });

  describe("authenticate", () => {
    it("should authenticate successfully with valid API key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ version: 1 }),
      });

      const result = await service.authenticate();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/users/test-user-id/items?limit=1"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Zotero-API-Key": "test-api-key",
          }),
        }),
      );
    });

    it("should throw authentication error on 401", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(service.authenticate()).rejects.toThrow(ZoteroAuthenticationError);
    });
  });

  describe("getUserLibrary", () => {
    const mockItems: ZoteroJournalArticle[] = [
      {
        key: "123456",
        version: 1,
        itemType: "journalArticle",
        title: "Test Article",
        publicationTitle: "Test Journal",
        creators: [],
        tags: [],
        collections: [],
        relations: {},
        dateAdded: "2024-01-01T00:00:00Z",
        dateModified: "2024-01-01T00:00:00Z",
      },
    ];

    beforeEach(async () => {
      // Authenticate first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ version: 1 }),
      });
      await service.authenticate();
      mockFetch.mockClear();
    });

    it("should fetch library items successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: mockItems,
            links: {},
          }),
      });

      const items = await service.getUserLibrary();
      expect(items).toEqual(mockItems);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/users/test-user-id/items"),
        expect.any(Object),
      );
    });

    it("should handle pagination", async () => {
      const page1Items = mockItems;
      const page2Items = [{ ...mockItems[0], key: "789012" }];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: page1Items,
              links: {
                next: { href: "https://api.zotero.org/users/test-user-id/items?start=50" },
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: page2Items,
              links: {},
            }),
        });

      const items = await service.getUserLibrary();
      expect(items).toEqual([...page1Items, ...page2Items]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should respect the limit parameter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: Array(100).fill(mockItems[0]),
            links: {},
          }),
      });

      const items = await service.getUserLibrary({ limit: 50 });
      expect(items).toHaveLength(50);
    });

    it("should throw error on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      });

      await expect(service.getUserLibrary()).rejects.toThrow(ZoteroRateLimitError);
    });
  });

  describe("searchItems", () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ version: 1 }),
      });
      await service.authenticate();
      mockFetch.mockClear();
    });

    it("should search items with query", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
            links: {},
          }),
      });

      await service.searchItems("test query");
      const url = mockFetch.mock.calls[0][0];
      expect(url).toMatch(/q=test[ +]query/);
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
    });

    it("should include additional search parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
            links: {},
          }),
      });

      await service.searchItems("test", { itemType: "journalArticle", limit: 10 });
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("q=test");
      expect(url).toContain("itemType=journalArticle");
      expect(url).toContain("limit=10");
    });
  });
});
