/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSectionIcon, getAvailableSectionIcons } from "../lib/section-icons";
import { Icon } from "@raycast/api";

describe("Section Icons", () => {
  describe("getSectionIcon", () => {
    describe("Brand icons for technologies", () => {
      it("should return brand icon for known programming languages", () => {
        const pythonIcon = getSectionIcon("python");
        expect(pythonIcon.color).toBe("3776AB");
        expect(pythonIcon.icon).toBeDefined();
        expect(typeof pythonIcon.icon).toBe("string");
        expect(pythonIcon.icon).toMatch(/^data:image\/svg\+xml/);
      });

      it("should return brand icon for known frameworks", () => {
        const reactIcon = getSectionIcon("react");
        expect(reactIcon.color).toBe("61DAFB");
        expect(reactIcon.icon).toBeDefined();
        expect(typeof reactIcon.icon).toBe("string");
        expect(reactIcon.icon).toMatch(/^data:image\/svg\+xml/);
      });

      it("should return brand icon for known databases", () => {
        const mysqlIcon = getSectionIcon("mysql");
        expect(mysqlIcon.color).toBe("4479A1");
        expect(mysqlIcon.icon).toBeDefined();
        expect(typeof mysqlIcon.icon).toBe("string");
        expect(mysqlIcon.icon).toMatch(/^data:image\/svg\+xml/);
      });

      it("should return brand icon for known devops tools", () => {
        const dockerIcon = getSectionIcon("docker");
        expect(dockerIcon.color).toBe("2496ED");
        expect(dockerIcon.icon).toBeDefined();
        expect(typeof dockerIcon.icon).toBe("string");
        expect(dockerIcon.icon).toMatch(/^data:image\/svg\+xml/);
      });

      it("should return brand icon for known package managers", () => {
        const npmIcon = getSectionIcon("npm");
        expect(npmIcon.color).toBe("CB3837");
        expect(npmIcon.icon).toBeDefined();
        expect(typeof npmIcon.icon).toBe("string");
        expect(npmIcon.icon).toMatch(/^data:image\/svg\+xml/);
      });

      it("should handle case insensitive section names", () => {
        const pythonIcon1 = getSectionIcon("python");
        const pythonIcon2 = getSectionIcon("PYTHON");
        const pythonIcon3 = getSectionIcon("Python");

        expect(pythonIcon1.color).toBe(pythonIcon2.color);
        expect(pythonIcon2.color).toBe(pythonIcon3.color);
      });
    });

    describe("Generic zsh concepts", () => {
      // Generic shell concepts go through Simple Icons lookup and fall back to folder icon
      // No hardcoded mappings - everything is determined dynamically
      it("should return valid icon for aliases section", () => {
        const icon = getSectionIcon("aliases");
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });

      it("should return valid icon for exports section", () => {
        const icon = getSectionIcon("exports");
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });

      it("should return valid icon for functions section", () => {
        const icon = getSectionIcon("functions");
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });

      it("should return valid icon for plugins section", () => {
        const icon = getSectionIcon("plugins");
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });

      it("should return valid icon for settings section", () => {
        const icon = getSectionIcon("settings");
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });

      it("should return valid icon for history section", () => {
        const icon = getSectionIcon("history");
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });

      it("should return valid icon for keybindings section", () => {
        const icon = getSectionIcon("keybindings");
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });
    });

    describe("Fallback icons for unknown sections", () => {
      it("should return an icon for unknown sections (may use fuzzy matching or fallback)", () => {
        // The fuzzy matching is aggressive, so even random strings may find a match
        // This test just verifies we always get a valid icon response
        const unknownIcon = getSectionIcon("zzqxjwvbkm");
        expect(unknownIcon.icon).toBeDefined();
        expect(unknownIcon.color).toBeDefined();
      });

      it("should return fallback icon for empty normalized strings", () => {
        // These strings normalize to empty and should use fallback
        const emptyIcon = getSectionIcon("");
        expect(emptyIcon.icon).toBe(Icon.Folder);
        expect(emptyIcon.color).toBeDefined();
      });
    });
  });

  describe("getAvailableSectionIcons", () => {
    it("should return array of available Simple Icon names", () => {
      const availableIcons = getAvailableSectionIcons();
      expect(Array.isArray(availableIcons)).toBe(true);
      expect(availableIcons.length).toBeGreaterThan(1000);
      expect(availableIcons).toContain("python");
      expect(availableIcons).toContain("react");
      expect(availableIcons).toContain("docker");
      expect(availableIcons).toContain("openjdk");
    });

    it("should return sorted list of icon names", () => {
      const availableIcons = getAvailableSectionIcons();
      const sorted = [...availableIcons].sort();
      expect(availableIcons).toEqual(sorted);
    });
  });

  describe("Brand icon data URL generation", () => {
    it("should generate valid data URLs for brand icons", () => {
      const pythonIcon = getSectionIcon("python");

      if (typeof pythonIcon.icon === "string") {
        expect(pythonIcon.icon).toMatch(/^data:image\/svg\+xml/);
      } else {
        expect(pythonIcon.icon).toBeDefined();
      }
    });

    it("should handle SVG data URL encoding", () => {
      const reactIcon = getSectionIcon("react");

      if (typeof reactIcon.icon === "string") {
        expect(reactIcon.icon).toMatch(/^data:image\/svg\+xml/);
        expect(reactIcon.icon.includes("base64") || reactIcon.icon.includes("charset=utf-8")).toBe(true);
      }
    });
  });

  describe("Synonyms and normalization", () => {
    it("should handle Kubernetes synonyms (k8s)", () => {
      const a = getSectionIcon("k8s");
      const b = getSectionIcon("Kubernetes");
      expect(a.color).toBe(b.color);
      expect(typeof a.icon === typeof b.icon).toBe(true);
    });

    it("should handle Postgres synonyms (postgres, psql, postgresql)", () => {
      const p1 = getSectionIcon("postgres");
      const p2 = getSectionIcon("psql");
      const p3 = getSectionIcon("PostgreSQL");
      expect(p1.color).toBe(p2.color);
      expect(p2.color).toBe(p3.color);
    });

    it("should handle VS Code synonyms (vscode, visual studio code)", () => {
      const v1 = getSectionIcon("vscode");
      const v2 = getSectionIcon("Visual Studio Code");
      expect(v1.color).toBe(v2.color);
    });

    it("should handle cloud platform synonyms (aws, Amazon Web Services)", () => {
      const a1 = getSectionIcon("aws");
      const a2 = getSectionIcon("Amazon Web Services");
      expect(a1.color).toBe(a2.color);
    });

    it("should handle GitHub Actions variations", () => {
      const g1 = getSectionIcon("GitHub Actions");
      const g2 = getSectionIcon("githubactions");
      expect(g1.color).toBe(g2.color);
    });

    it("should return uppercase hex color for brand icons", () => {
      const icon = getSectionIcon("python");
      expect(icon.color).toBe(icon.color.toUpperCase());
    });
  });

  describe("Dynamic icon system", () => {
    it("should find Simple Icons for common technologies", () => {
      const testCases = ["Python", "React", "Docker", "MongoDB", "Redis", "GitHub"];

      testCases.forEach((sectionName) => {
        const icon = getSectionIcon(sectionName);
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
        expect(typeof icon.icon).toBe("string");
        expect(icon.icon).toMatch(/^data:image\/svg\+xml/);
      });
    });

    it("should handle variations and special characters", () => {
      const variations = ["Node.js", "nodejs", "NodeJS", "NODE.JS", "React.js", "reactjs", "ReactJS"];

      variations.forEach((sectionName) => {
        const icon = getSectionIcon(sectionName);
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });
    });

    it("should normalize section names correctly", () => {
      const pythonVariations = ["Python", "python", "PYTHON"];
      const pythonIcons = pythonVariations.map((name) => getSectionIcon(name));

      const colors = pythonIcons.map((icon) => icon.color);
      const uniqueColors = [...new Set(colors)];
      expect(uniqueColors.length).toBe(1);
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle empty section names", () => {
      const icon = getSectionIcon("");
      expect(icon.icon).toBeDefined();
      expect(icon.color).toBeDefined();
    });

    it("should handle null and undefined section names", () => {
      expect(() => getSectionIcon(null as any)).toThrow();
      expect(() => getSectionIcon(undefined as any)).toThrow();
    });

    it("should handle section names with special characters", () => {
      const specialCases = [
        "test-section",
        "test_section",
        "test.section",
        "test/section",
        "test@section",
        "test#section",
      ];

      specialCases.forEach((sectionName) => {
        const icon = getSectionIcon(sectionName);
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });
    });

    it("should handle very long section names", () => {
      const longName = "a".repeat(1000);
      const icon = getSectionIcon(longName);
      expect(icon.icon).toBeDefined();
      expect(icon.color).toBeDefined();
    });

    it("should handle section names with numbers", () => {
      const numericCases = ["python3", "nodejs16", "php7", "ruby2"];

      numericCases.forEach((sectionName) => {
        const icon = getSectionIcon(sectionName);
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });
    });

    it("should handle section names with spaces", () => {
      const spacedCases = ["Visual Studio Code", "Google Chrome", "Mozilla Firefox"];

      spacedCases.forEach((sectionName) => {
        const icon = getSectionIcon(sectionName);
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });
    });

    it("should handle mixed case and special formatting", () => {
      const mixedCases = ["PyThOn", "ReAcT.jS", "NoDe.Js", "JaVaScRiPt", "TyPeScRiPt"];

      mixedCases.forEach((sectionName) => {
        const icon = getSectionIcon(sectionName);
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });
    });

    it("should handle section names that are common words", () => {
      const commonWords = ["test", "main", "core", "base", "util", "helper"];

      commonWords.forEach((sectionName) => {
        const icon = getSectionIcon(sectionName);
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });
    });
  });
});
