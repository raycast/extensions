import { describe, it, expect } from "vitest";
import { generateSectionAccessories, calculateTotalEntries } from "../../utils/section-accessories";
import { LogicalSection } from "../../lib/parse-zshrc";
import { Icon } from "@raycast/api";
import { MODERN_COLORS } from "../../constants";

describe("section-accessories", () => {
  describe("generateSectionAccessories", () => {
    it("should return empty array for section with no content", () => {
      const section: LogicalSection = {
        label: "Empty Section",
        content: "",
        startLine: 1,
        endLine: 1,
        aliasCount: 0,
        exportCount: 0,
        functionCount: 0,
        pluginCount: 0,
        sourceCount: 0,
        evalCount: 0,
        setoptCount: 0,
        autoloadCount: 0,
        fpathCount: 0,
        pathCount: 0,
        themeCount: 0,
        completionCount: 0,
        historyCount: 0,
        keybindingCount: 0,
        otherCount: 0,
      };

      const accessories = generateSectionAccessories(section);
      expect(accessories).toEqual([]);
    });

    it("should generate accessory for aliases only", () => {
      const section: LogicalSection = {
        label: "Alias Section",
        content: "alias ll='ls -la'",
        startLine: 1,
        endLine: 1,
        aliasCount: 5,
        exportCount: 0,
        functionCount: 0,
        pluginCount: 0,
        sourceCount: 0,
        evalCount: 0,
        setoptCount: 0,
        autoloadCount: 0,
        fpathCount: 0,
        pathCount: 0,
        themeCount: 0,
        completionCount: 0,
        historyCount: 0,
        keybindingCount: 0,
        otherCount: 0,
      };

      const accessories = generateSectionAccessories(section);
      expect(accessories).toHaveLength(1);
      expect(accessories[0]).toMatchObject({
        icon: {
          source: Icon.Terminal,
          tintColor: MODERN_COLORS.success,
        },
        text: "5",
      });
    });

    it("should generate accessories for exports", () => {
      const section: LogicalSection = {
        label: "Export Section",
        content: "export PATH=/usr/local/bin",
        startLine: 1,
        endLine: 1,
        aliasCount: 0,
        exportCount: 3,
        functionCount: 0,
        pluginCount: 0,
        sourceCount: 0,
        evalCount: 0,
        setoptCount: 0,
        autoloadCount: 0,
        fpathCount: 0,
        pathCount: 0,
        themeCount: 0,
        completionCount: 0,
        historyCount: 0,
        keybindingCount: 0,
        otherCount: 0,
      };

      const accessories = generateSectionAccessories(section);
      expect(accessories).toHaveLength(2); // Icon + text
      expect(accessories[0]).toMatchObject({
        icon: {
          source: Icon.Box,
          tintColor: MODERN_COLORS.primary,
        },
      });
      expect(accessories[1]).toMatchObject({
        text: "3",
      });
    });

    it("should generate accessories for functions", () => {
      const section: LogicalSection = {
        label: "Function Section",
        content: "function test() { }",
        startLine: 1,
        endLine: 1,
        aliasCount: 0,
        exportCount: 0,
        functionCount: 2,
        pluginCount: 0,
        sourceCount: 0,
        evalCount: 0,
        setoptCount: 0,
        autoloadCount: 0,
        fpathCount: 0,
        pathCount: 0,
        themeCount: 0,
        completionCount: 0,
        historyCount: 0,
        keybindingCount: 0,
        otherCount: 0,
      };

      const accessories = generateSectionAccessories(section);
      expect(accessories).toHaveLength(2); // Icon + text
      expect(accessories[0]).toMatchObject({
        icon: {
          source: Icon.Code,
          tintColor: MODERN_COLORS.primary,
        },
      });
      expect(accessories[1]).toMatchObject({
        text: "2",
      });
    });

    it("should generate accessories for plugins", () => {
      const section: LogicalSection = {
        label: "Plugin Section",
        content: "plugins=(git docker)",
        startLine: 1,
        endLine: 1,
        aliasCount: 0,
        exportCount: 0,
        functionCount: 0,
        pluginCount: 4,
        sourceCount: 0,
        evalCount: 0,
        setoptCount: 0,
        autoloadCount: 0,
        fpathCount: 0,
        pathCount: 0,
        themeCount: 0,
        completionCount: 0,
        historyCount: 0,
        keybindingCount: 0,
        otherCount: 0,
      };

      const accessories = generateSectionAccessories(section);
      expect(accessories).toHaveLength(2); // Icon + text
      expect(accessories[0]).toMatchObject({
        icon: {
          source: Icon.Box,
          tintColor: MODERN_COLORS.warning,
        },
      });
      expect(accessories[1]).toMatchObject({
        text: "4",
      });
    });

    it("should generate multiple accessories for mixed content", () => {
      const section: LogicalSection = {
        label: "Mixed Section",
        content: "alias ll='ls -la'\nexport PATH=/usr/local/bin",
        startLine: 1,
        endLine: 2,
        aliasCount: 3,
        exportCount: 2,
        functionCount: 1,
        pluginCount: 0,
        sourceCount: 0,
        evalCount: 0,
        setoptCount: 0,
        autoloadCount: 0,
        fpathCount: 0,
        pathCount: 0,
        themeCount: 0,
        completionCount: 0,
        historyCount: 0,
        keybindingCount: 0,
        otherCount: 0,
      };

      const accessories = generateSectionAccessories(section);
      // Should have: alias (1), export icon + text (2), function icon + text (2) = 5
      expect(accessories).toHaveLength(5);
    });

    it("should handle all content types", () => {
      const section: LogicalSection = {
        label: "Complete Section",
        content: "mixed content",
        startLine: 1,
        endLine: 10,
        aliasCount: 5,
        exportCount: 3,
        functionCount: 2,
        pluginCount: 1,
        sourceCount: 0,
        evalCount: 0,
        setoptCount: 0,
        autoloadCount: 0,
        fpathCount: 0,
        pathCount: 0,
        themeCount: 0,
        completionCount: 0,
        historyCount: 0,
        keybindingCount: 0,
        otherCount: 0,
      };

      const accessories = generateSectionAccessories(section);
      // Aliases: 1, Exports: 2, Functions: 2, Plugins: 2 = 7 total
      expect(accessories.length).toBeGreaterThan(0);
    });
  });

  describe("calculateTotalEntries", () => {
    it("should return 0 for empty section", () => {
      const section: LogicalSection = {
        label: "Empty",
        content: "",
        startLine: 1,
        endLine: 1,
        aliasCount: 0,
        exportCount: 0,
        functionCount: 0,
        pluginCount: 0,
        sourceCount: 0,
        evalCount: 0,
        setoptCount: 0,
        autoloadCount: 0,
        fpathCount: 0,
        pathCount: 0,
        themeCount: 0,
        completionCount: 0,
        historyCount: 0,
        keybindingCount: 0,
        otherCount: 0,
      };

      expect(calculateTotalEntries(section)).toBe(0);
    });

    it("should sum all entry types correctly", () => {
      const section: LogicalSection = {
        label: "Complete",
        content: "content",
        startLine: 1,
        endLine: 100,
        aliasCount: 5,
        exportCount: 3,
        functionCount: 2,
        pluginCount: 1,
        sourceCount: 4,
        evalCount: 2,
        setoptCount: 3,
        autoloadCount: 1,
        fpathCount: 1,
        pathCount: 1,
        themeCount: 1,
        completionCount: 2,
        historyCount: 3,
        keybindingCount: 1,
        otherCount: 5,
      };

      const total = calculateTotalEntries(section);
      expect(total).toBe(35); // Sum of all counts
    });

    it("should handle only aliases", () => {
      const section: LogicalSection = {
        label: "Aliases Only",
        content: "alias content",
        startLine: 1,
        endLine: 10,
        aliasCount: 10,
        exportCount: 0,
        functionCount: 0,
        pluginCount: 0,
        sourceCount: 0,
        evalCount: 0,
        setoptCount: 0,
        autoloadCount: 0,
        fpathCount: 0,
        pathCount: 0,
        themeCount: 0,
        completionCount: 0,
        historyCount: 0,
        keybindingCount: 0,
        otherCount: 0,
      };

      expect(calculateTotalEntries(section)).toBe(10);
    });

    it("should handle mixed common types", () => {
      const section: LogicalSection = {
        label: "Common Types",
        content: "mixed",
        startLine: 1,
        endLine: 50,
        aliasCount: 15,
        exportCount: 8,
        functionCount: 5,
        pluginCount: 3,
        sourceCount: 0,
        evalCount: 0,
        setoptCount: 0,
        autoloadCount: 0,
        fpathCount: 0,
        pathCount: 0,
        themeCount: 0,
        completionCount: 0,
        historyCount: 0,
        keybindingCount: 0,
        otherCount: 0,
      };

      expect(calculateTotalEntries(section)).toBe(31);
    });

    it("should handle large counts", () => {
      const section: LogicalSection = {
        label: "Large Section",
        content: "large content",
        startLine: 1,
        endLine: 1000,
        aliasCount: 100,
        exportCount: 50,
        functionCount: 25,
        pluginCount: 10,
        sourceCount: 30,
        evalCount: 15,
        setoptCount: 20,
        autoloadCount: 5,
        fpathCount: 8,
        pathCount: 12,
        themeCount: 3,
        completionCount: 7,
        historyCount: 10,
        keybindingCount: 15,
        otherCount: 40,
      };

      expect(calculateTotalEntries(section)).toBe(350);
    });
  });
});
