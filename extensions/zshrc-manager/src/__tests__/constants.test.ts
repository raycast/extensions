import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSectionFormatsInOrder } from "../constants";
import { SectionMarkerType } from "../types/enums";
import { getSectionPrefs, getCustomPatterns } from "../lib/preferences";

// Mock preferences module
vi.mock("../lib/preferences", () => ({
  getSectionPrefs: vi.fn(),
  getCustomPatterns: vi.fn(),
}));

const mockGetSectionPrefs = vi.mocked(getSectionPrefs);
const mockGetCustomPatterns = vi.mocked(getCustomPatterns);

describe("constants.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSectionFormatsInOrder", () => {
    it("should return default patterns when defaults are enabled and no custom patterns", () => {
      mockGetSectionPrefs.mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: false,
        enableCustomZshrcPath: false,
      });
      mockGetCustomPatterns.mockReturnValue({
        headerPattern: null,
        startPattern: null,
        endPattern: null,
      });

      const formats = getSectionFormatsInOrder();

      expect(formats).toHaveLength(9); // All default patterns
      expect(formats[0]?.type).toBe(SectionMarkerType.CUSTOM_START);
      expect(formats[1]?.type).toBe(SectionMarkerType.CUSTOM_END);
      expect(formats[2]?.type).toBe(SectionMarkerType.DASHED_END);
      expect(formats[3]?.type).toBe(SectionMarkerType.DASHED_START);
      expect(formats[4]?.type).toBe(SectionMarkerType.BRACKETED);
      expect(formats[5]?.type).toBe(SectionMarkerType.HASH);
      expect(formats[6]?.type).toBe(SectionMarkerType.FUNCTION_START);
      expect(formats[7]?.type).toBe(SectionMarkerType.FUNCTION_END);
      expect(formats[8]?.type).toBe(SectionMarkerType.LABELED);
    });

    it("should return empty array when defaults are disabled and no custom patterns", () => {
      mockGetSectionPrefs.mockReturnValue({
        enableDefaults: false,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: false,
        enableCustomZshrcPath: false,
      });
      mockGetCustomPatterns.mockReturnValue({
        headerPattern: null,
        startPattern: null,
        endPattern: null,
      });

      const formats = getSectionFormatsInOrder();

      expect(formats).toHaveLength(0);
    });

    it("should prioritize custom start/end patterns over defaults", () => {
      const customStartPattern = /^#\s*custom-start\s+(.+)$/i;
      const customEndPattern = /^#\s*custom-end$/i;

      mockGetSectionPrefs.mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: true,
        enableCustomZshrcPath: false,
      });
      mockGetCustomPatterns.mockReturnValue({
        headerPattern: null,
        startPattern: customStartPattern,
        endPattern: customEndPattern,
      });

      const formats = getSectionFormatsInOrder();

      // Should have custom patterns (2) + defaults without CUSTOM_START/END (7) = 9 total
      // Default CUSTOM_START/CUSTOM_END are skipped when custom patterns are enabled
      expect(formats).toHaveLength(9);
      // Custom patterns should come first
      expect(formats[0]?.type).toBe(SectionMarkerType.CUSTOM_START);
      expect(formats[0]?.regex).toBe(customStartPattern);
      expect(formats[1]?.type).toBe(SectionMarkerType.CUSTOM_END);
      expect(formats[1]?.regex).toBe(customEndPattern);
    });

    it("should include custom header pattern when enabled", () => {
      const customHeaderPattern = /^#\s+custom-header\s+(.+)$/i;

      mockGetSectionPrefs.mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: true,
        enableCustomStartEndPatterns: false,
        enableCustomZshrcPath: false,
      });
      mockGetCustomPatterns.mockReturnValue({
        headerPattern: customHeaderPattern,
        startPattern: null,
        endPattern: null,
      });

      const formats = getSectionFormatsInOrder();

      // Custom header pattern should be added at the end
      const lastFormat = formats[formats.length - 1];
      expect(lastFormat?.type).toBe(SectionMarkerType.LABELED);
      expect(lastFormat?.regex).toBe(customHeaderPattern);
    });

    it("should include custom header pattern even when defaults are disabled", () => {
      const customHeaderPattern = /^#\s+custom-header\s+(.+)$/i;

      mockGetSectionPrefs.mockReturnValue({
        enableDefaults: false,
        enableCustomHeaderPattern: true,
        enableCustomStartEndPatterns: false,
        enableCustomZshrcPath: false,
      });
      mockGetCustomPatterns.mockReturnValue({
        headerPattern: customHeaderPattern,
        startPattern: null,
        endPattern: null,
      });

      const formats = getSectionFormatsInOrder();

      expect(formats).toHaveLength(1);
      expect(formats[0]?.type).toBe(SectionMarkerType.LABELED);
      expect(formats[0]?.regex).toBe(customHeaderPattern);
    });

    it("should include all custom patterns when all are enabled", () => {
      const customStartPattern = /^#\s*custom-start\s+(.+)$/i;
      const customEndPattern = /^#\s*custom-end$/i;
      const customHeaderPattern = /^#\s+custom-header\s+(.+)$/i;

      mockGetSectionPrefs.mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: true,
        enableCustomStartEndPatterns: true,
        enableCustomZshrcPath: false,
      });
      mockGetCustomPatterns.mockReturnValue({
        headerPattern: customHeaderPattern,
        startPattern: customStartPattern,
        endPattern: customEndPattern,
      });

      const formats = getSectionFormatsInOrder();

      // Should have custom start/end (2) + defaults without CUSTOM_START/END (7) + custom header (1) = 10 total
      // Default CUSTOM_START/CUSTOM_END are skipped when custom patterns are enabled
      expect(formats).toHaveLength(10);
      // Custom start/end should be first
      expect(formats[0]?.type).toBe(SectionMarkerType.CUSTOM_START);
      expect(formats[0]?.regex).toBe(customStartPattern);
      expect(formats[1]?.type).toBe(SectionMarkerType.CUSTOM_END);
      expect(formats[1]?.regex).toBe(customEndPattern);
      // Custom header should be last
      const lastFormat = formats[formats.length - 1];
      expect(lastFormat?.type).toBe(SectionMarkerType.LABELED);
      expect(lastFormat?.regex).toBe(customHeaderPattern);
    });

    it("should handle only custom start pattern", () => {
      const customStartPattern = /^#\s*custom-start\s+(.+)$/i;

      mockGetSectionPrefs.mockReturnValue({
        enableDefaults: false,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: true,
        enableCustomZshrcPath: false,
      });
      mockGetCustomPatterns.mockReturnValue({
        headerPattern: null,
        startPattern: customStartPattern,
        endPattern: null,
      });

      const formats = getSectionFormatsInOrder();

      expect(formats).toHaveLength(1);
      expect(formats[0]?.type).toBe(SectionMarkerType.CUSTOM_START);
      expect(formats[0]?.regex).toBe(customStartPattern);
    });

    it("should handle only custom end pattern", () => {
      const customEndPattern = /^#\s*custom-end$/i;

      mockGetSectionPrefs.mockReturnValue({
        enableDefaults: false,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: true,
        enableCustomZshrcPath: false,
      });
      mockGetCustomPatterns.mockReturnValue({
        headerPattern: null,
        startPattern: null,
        endPattern: customEndPattern,
      });

      const formats = getSectionFormatsInOrder();

      expect(formats).toHaveLength(1);
      expect(formats[0]?.type).toBe(SectionMarkerType.CUSTOM_END);
      expect(formats[0]?.regex).toBe(customEndPattern);
    });

    it("should maintain correct priority order", () => {
      const customStartPattern = /^#\s*custom-start\s+(.+)$/i;
      const customEndPattern = /^#\s*custom-end$/i;
      const customHeaderPattern = /^#\s+custom-header\s+(.+)$/i;

      mockGetSectionPrefs.mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: true,
        enableCustomStartEndPatterns: true,
        enableCustomZshrcPath: false,
      });
      mockGetCustomPatterns.mockReturnValue({
        headerPattern: customHeaderPattern,
        startPattern: customStartPattern,
        endPattern: customEndPattern,
      });

      const formats = getSectionFormatsInOrder();

      // Order should be: custom start, custom end, defaults without CUSTOM_START/END (7 patterns), custom header
      // Default CUSTOM_START/CUSTOM_END are skipped when custom patterns are enabled
      expect(formats.length).toBe(10); // 2 custom + 7 defaults + 1 custom header
      expect(formats[0]?.type).toBe(SectionMarkerType.CUSTOM_START);
      expect(formats[1]?.type).toBe(SectionMarkerType.CUSTOM_END);
      // Defaults follow (without CUSTOM_START/CUSTOM_END)
      expect(formats[2]?.type).toBe(SectionMarkerType.DASHED_END);
      expect(formats[3]?.type).toBe(SectionMarkerType.DASHED_START);
      // Custom header is last
      expect(formats[9]?.type).toBe(SectionMarkerType.LABELED);
      expect(formats[9]?.regex).toBe(customHeaderPattern);
    });

    it("should handle null custom patterns gracefully", () => {
      mockGetSectionPrefs.mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: true,
        enableCustomStartEndPatterns: true,
        enableCustomZshrcPath: false,
      });
      mockGetCustomPatterns.mockReturnValue({
        headerPattern: null,
        startPattern: null,
        endPattern: null,
      });

      const formats = getSectionFormatsInOrder();

      // When custom patterns feature is enabled but patterns are null, defaults still include CUSTOM_START/CUSTOM_END
      // because no actual custom patterns exist to replace them
      // Should have defaults (9 patterns) - CUSTOM_START/CUSTOM_END are included since no actual custom patterns exist
      expect(formats).toHaveLength(9);
      expect(formats[0]?.type).toBe(SectionMarkerType.CUSTOM_START);
      expect(formats[8]?.type).toBe(SectionMarkerType.LABELED);
    });

    it("should return formats with correct regex instances", () => {
      mockGetSectionPrefs.mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: false,
        enableCustomZshrcPath: false,
      });
      mockGetCustomPatterns.mockReturnValue({
        headerPattern: null,
        startPattern: null,
        endPattern: null,
      });

      const formats = getSectionFormatsInOrder();

      // Verify all formats have regex properties
      formats.forEach((format) => {
        expect(format).toHaveProperty("type");
        expect(format).toHaveProperty("regex");
        expect(format.regex).toBeInstanceOf(RegExp);
      });
    });
  });
});
