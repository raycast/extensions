import { describe, it, expect, vi, beforeEach } from "vitest";
import { SectionMarkerType } from "../types/enums";

// Mock only the Raycast API, not the preferences module itself
vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(),
}));

import { getPreferenceValues } from "@raycast/api";
import { getSectionFormatsInOrder } from "../lib/preferences";

const mockGetPreferenceValues = vi.mocked(getPreferenceValues);

describe("constants.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSectionFormatsInOrder", () => {
    it("should return default patterns when defaults are enabled and no custom patterns", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: false,
        enableCustomZshrcPath: false,
        configFileType: "zshrc",
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
      mockGetPreferenceValues.mockReturnValue({
        enableDefaults: false,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: false,
        enableCustomZshrcPath: false,
        configFileType: "zshrc",
      });

      const formats = getSectionFormatsInOrder();

      expect(formats).toHaveLength(0);
    });

    it("should prioritize custom start/end patterns over defaults", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: true,
        enableCustomZshrcPath: false,
        configFileType: "zshrc",
        customStartPattern: "#\\s*custom-start\\s+(.+)",
        customEndPattern: "#\\s*custom-end",
      });

      const formats = getSectionFormatsInOrder();

      // Should have custom patterns (2) + defaults without CUSTOM_START/END (7) = 9 total
      expect(formats).toHaveLength(9);
      // Custom patterns should come first
      expect(formats[0]?.type).toBe(SectionMarkerType.CUSTOM_START);
      expect(formats[1]?.type).toBe(SectionMarkerType.CUSTOM_END);
    });

    it("should include custom header pattern when enabled", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: true,
        enableCustomStartEndPatterns: false,
        enableCustomZshrcPath: false,
        configFileType: "zshrc",
        customHeaderPattern: "#\\s+custom-header\\s+(.+)",
      });

      const formats = getSectionFormatsInOrder();

      // Custom header pattern should be added at the end (10 = 9 defaults + 1 custom header)
      expect(formats).toHaveLength(10);
      const lastFormat = formats[formats.length - 1];
      expect(lastFormat?.type).toBe(SectionMarkerType.LABELED);
    });

    it("should include custom header pattern even when defaults are disabled", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableDefaults: false,
        enableCustomHeaderPattern: true,
        enableCustomStartEndPatterns: false,
        enableCustomZshrcPath: false,
        configFileType: "zshrc",
        customHeaderPattern: "#\\s+custom-header\\s+(.+)",
      });

      const formats = getSectionFormatsInOrder();

      expect(formats).toHaveLength(1);
      expect(formats[0]?.type).toBe(SectionMarkerType.LABELED);
    });

    it("should include all custom patterns when all are enabled", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: true,
        enableCustomStartEndPatterns: true,
        enableCustomZshrcPath: false,
        configFileType: "zshrc",
        customStartPattern: "#\\s*custom-start\\s+(.+)",
        customEndPattern: "#\\s*custom-end",
        customHeaderPattern: "#\\s+custom-header\\s+(.+)",
      });

      const formats = getSectionFormatsInOrder();

      // Should have custom start/end (2) + defaults without CUSTOM_START/END (7) + custom header (1) = 10 total
      expect(formats).toHaveLength(10);
      // Custom start/end should be first
      expect(formats[0]?.type).toBe(SectionMarkerType.CUSTOM_START);
      expect(formats[1]?.type).toBe(SectionMarkerType.CUSTOM_END);
      // Custom header should be last
      const lastFormat = formats[formats.length - 1];
      expect(lastFormat?.type).toBe(SectionMarkerType.LABELED);
    });

    it("should handle only custom start pattern", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableDefaults: false,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: true,
        enableCustomZshrcPath: false,
        configFileType: "zshrc",
        customStartPattern: "#\\s*custom-start\\s+(.+)",
      });

      const formats = getSectionFormatsInOrder();

      expect(formats).toHaveLength(1);
      expect(formats[0]?.type).toBe(SectionMarkerType.CUSTOM_START);
    });

    it("should handle only custom end pattern", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableDefaults: false,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: true,
        enableCustomZshrcPath: false,
        configFileType: "zshrc",
        customEndPattern: "#\\s*custom-end",
      });

      const formats = getSectionFormatsInOrder();

      expect(formats).toHaveLength(1);
      expect(formats[0]?.type).toBe(SectionMarkerType.CUSTOM_END);
    });

    it("should maintain correct priority order", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: true,
        enableCustomStartEndPatterns: true,
        enableCustomZshrcPath: false,
        configFileType: "zshrc",
        customStartPattern: "#\\s*custom-start\\s+(.+)",
        customEndPattern: "#\\s*custom-end",
        customHeaderPattern: "#\\s+custom-header\\s+(.+)",
      });

      const formats = getSectionFormatsInOrder();

      // Order should be: custom start, custom end, defaults without CUSTOM_START/END (7 patterns), custom header
      expect(formats.length).toBe(10); // 2 custom + 7 defaults + 1 custom header
      expect(formats[0]?.type).toBe(SectionMarkerType.CUSTOM_START);
      expect(formats[1]?.type).toBe(SectionMarkerType.CUSTOM_END);
      // Defaults follow (without CUSTOM_START/CUSTOM_END)
      expect(formats[2]?.type).toBe(SectionMarkerType.DASHED_END);
      expect(formats[3]?.type).toBe(SectionMarkerType.DASHED_START);
      // Custom header is last
      expect(formats[9]?.type).toBe(SectionMarkerType.LABELED);
    });

    it("should handle null custom patterns gracefully", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: true,
        enableCustomStartEndPatterns: true,
        enableCustomZshrcPath: false,
        configFileType: "zshrc",
        // No custom patterns provided (undefined)
      });

      const formats = getSectionFormatsInOrder();

      // When custom patterns feature is enabled but patterns are undefined, defaults still include CUSTOM_START/CUSTOM_END
      expect(formats).toHaveLength(9);
      expect(formats[0]?.type).toBe(SectionMarkerType.CUSTOM_START);
      expect(formats[8]?.type).toBe(SectionMarkerType.LABELED);
    });

    it("should return formats with correct regex instances", () => {
      mockGetPreferenceValues.mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: false,
        enableCustomZshrcPath: false,
        configFileType: "zshrc",
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
