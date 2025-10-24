/**
 * Unit tests for preferences.ts
 *
 * Tests preference reading, pattern compilation, and validation.
 */

import { getSectionPrefs, compilePattern, hasCaptureGroup, getCustomPatterns } from "../lib/preferences";
import { getPreferenceValues } from "@raycast/api";
import { vi } from "vitest";

describe("preferences.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSectionPrefs", () => {
    it("should read preferences from Raycast", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: false,
      });

      const prefs = getSectionPrefs();
      expect(prefs.enableDefaults).toBe(true);
      expect(prefs.enableCustomHeaderPattern).toBe(false);
      expect(prefs.enableCustomStartEndPatterns).toBe(false);
    });

    it("should handle empty preferences", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({});

      const prefs = getSectionPrefs();
      expect(prefs).toEqual({});
    });
  });

  describe("compilePattern", () => {
    it("should compile valid regex pattern", () => {
      const pattern = compilePattern("^#\\s+(.+)$", "test");
      expect(pattern).not.toBeNull();
      expect(pattern).toBeInstanceOf(RegExp);
    });

    it("should auto-anchor patterns without ^", () => {
      const pattern = compilePattern("#\\s+(.+)$", "test");
      expect(pattern).not.toBeNull();
      const match = "# My Section".match(pattern!);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("My Section");
    });

    it("should make patterns case-insensitive", () => {
      const pattern = compilePattern("^#\\s+(.+)$", "test");
      expect(pattern).not.toBeNull();
      const match = "# MY SECTION".match(pattern!);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("MY SECTION");
    });

    it("should return null for empty pattern", () => {
      const pattern = compilePattern("", "test");
      expect(pattern).toBeNull();
    });

    it("should return null for undefined pattern", () => {
      const pattern = compilePattern(undefined, "test");
      expect(pattern).toBeNull();
    });

    it("should return null for whitespace-only pattern", () => {
      const pattern = compilePattern("   ", "test");
      expect(pattern).toBeNull();
    });

    it("should return null for invalid regex", () => {
      const pattern = compilePattern("[invalid regex", "test");
      expect(pattern).toBeNull();
    });
  });

  describe("hasCaptureGroup", () => {
    it("should return true for pattern with one capture group", () => {
      expect(hasCaptureGroup("^#\\s+(.+)$")).toBe(true);
      expect(hasCaptureGroup("^start (.+)$")).toBe(true);
    });

    it("should return false for pattern with no capture groups", () => {
      expect(hasCaptureGroup("^#\\s+$")).toBe(false);
      expect(hasCaptureGroup("^start$")).toBe(false);
    });

    it("should return false for pattern with multiple capture groups", () => {
      expect(hasCaptureGroup("^(.+)\\s+(.+)$")).toBe(false);
      expect(hasCaptureGroup("^(start)\\s+(.+)$")).toBe(false);
    });

    it("should ignore non-capturing groups", () => {
      expect(hasCaptureGroup("^(?:\\s*)#\\s+(.+)$")).toBe(true);
      expect(hasCaptureGroup("^(?!End)(.+)$")).toBe(true);
    });
  });

  describe("getCustomPatterns", () => {
    it("should return null patterns when not enabled", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: false,
      });

      const patterns = getCustomPatterns();
      expect(patterns.headerPattern).toBeNull();
      expect(patterns.startPattern).toBeNull();
      expect(patterns.endPattern).toBeNull();
    });

    it("should compile valid custom header pattern", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: true,
        customHeaderPattern: "^#\\s+(.+)$",
        enableCustomStartEndPatterns: false,
      });

      const patterns = getCustomPatterns();
      expect(patterns.headerPattern).not.toBeNull();
      expect(patterns.headerPattern).toBeInstanceOf(RegExp);
    });

    it("should compile valid custom start/end patterns", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: true,
        customStartPattern: "^#\\s*start\\s+(.+)$",
        customEndPattern: "^#\\s*end\\s+(.+)$",
      });

      const patterns = getCustomPatterns();
      expect(patterns.startPattern).not.toBeNull();
      expect(patterns.endPattern).not.toBeNull();
    });

    it("should allow end pattern without capture group", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: true,
        customStartPattern: "^#\\s*start\\s+(.+)$",
        customEndPattern: "^#\\s*end$",
      });

      const patterns = getCustomPatterns();
      expect(patterns.endPattern).not.toBeNull();
    });

    it("should ignore header pattern without capture group", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: true,
        customHeaderPattern: "^#",
        enableCustomStartEndPatterns: false,
      });

      const patterns = getCustomPatterns();
      expect(patterns.headerPattern).toBeNull();
    });

    it("should ignore start pattern without capture group", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: true,
        customStartPattern: "^#\\s*start$",
        customEndPattern: "^#\\s*end$",
      });

      const patterns = getCustomPatterns();
      expect(patterns.startPattern).toBeNull();
      expect(patterns.endPattern).not.toBeNull();
    });
  });
});
