/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSectionIcon, getAvailableSectionIcons } from "../lib/section-icons";
import { Icon } from "@raycast/api";

describe("Section Icons", () => {
  describe("getSectionIcon", () => {
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

    it("should return appropriate icon for unknown sections", () => {
      const unknownIcon = getSectionIcon("unknown-section");
      // Dynamic system should find a Simple Icon or use semantic fallback
      expect(unknownIcon.icon).toBeDefined();
      expect(unknownIcon.color).toBeDefined();
      // Should be either a data URL (Simple Icon) or Raycast icon (semantic fallback)
      expect(typeof unknownIcon.icon === "string" || typeof unknownIcon.icon === "object").toBe(true);
    });

    it("should handle config sections semantically", () => {
      const configIcon = getSectionIcon("my-config");
      // Should use semantic categorization for config sections
      expect(configIcon.icon).toBeDefined();
      expect(configIcon.color).toBeDefined();
      // Should be either Raycast icon (semantic) or Simple Icon (if found)
      expect(typeof configIcon.icon === "string" || typeof configIcon.icon === "object").toBe(true);
    });

    it("should handle aliases section semantically", () => {
      const aliasesIcon = getSectionIcon("aliases");
      // Should use semantic categorization for aliases
      expect(aliasesIcon.icon).toBe(Icon.Terminal);
      expect(aliasesIcon.color).toBeDefined();
    });

    it("should handle exports section semantically", () => {
      const exportsIcon = getSectionIcon("exports");
      // Should use semantic categorization for exports
      expect(exportsIcon.icon).toBe(Icon.Box);
      expect(exportsIcon.color).toBeDefined();
    });
  });

  describe("getAvailableSectionIcons", () => {
    it("should return array of available Simple Icon names", () => {
      const availableIcons = getAvailableSectionIcons();
      expect(Array.isArray(availableIcons)).toBe(true);
      expect(availableIcons.length).toBeGreaterThan(1000); // Simple Icons has many icons
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

      // Check if it's a data URL (starts with data:image/svg+xml)
      if (typeof pythonIcon.icon === "string") {
        expect(pythonIcon.icon).toMatch(/^data:image\/svg\+xml/);
      } else {
        // If it's a Raycast icon, that's also valid as fallback
        expect(pythonIcon.icon).toBeDefined();
      }
    });

    it("should handle SVG data URL encoding", () => {
      const reactIcon = getSectionIcon("react");

      if (typeof reactIcon.icon === "string") {
        expect(reactIcon.icon).toMatch(/^data:image\/svg\+xml/);
        // Should be either base64 or URL encoded
        expect(reactIcon.icon.includes("base64") || reactIcon.icon.includes("charset=utf-8")).toBe(true);
      }
    });
  });

  describe("Problematic section labels", () => {
    it("should handle Java section labels", () => {
      const javaIcon1 = getSectionIcon("Java");
      const javaIcon2 = getSectionIcon("java");
      const javaIcon3 = getSectionIcon("JAVA");

      // Java should use OpenJDK icon since Java icon doesn't exist in Simple Icons
      expect(javaIcon1.icon).toBeDefined();
      expect(javaIcon2.icon).toBeDefined();
      expect(javaIcon3.icon).toBeDefined();

      // All should return the same result
      expect(javaIcon1.color).toBe(javaIcon2.color);
      expect(javaIcon2.color).toBe(javaIcon3.color);
    });

    it("should handle SDKMAN section labels", () => {
      const sdkmanIcon1 = getSectionIcon("SDKMAN!");
      const sdkmanIcon2 = getSectionIcon("SDKMAN");
      const sdkmanIcon3 = getSectionIcon("sdkman");

      // SDKMAN should fall back to Raycast icon since it doesn't exist in Simple Icons
      expect(sdkmanIcon1.icon).toBeDefined();
      expect(sdkmanIcon2.icon).toBeDefined();
      expect(sdkmanIcon3.icon).toBeDefined();

      // All should return the same result
      expect(sdkmanIcon1.color).toBe(sdkmanIcon2.color);
      expect(sdkmanIcon2.color).toBe(sdkmanIcon3.color);
    });

    it("should handle Node.js section labels", () => {
      const nodeIcon1 = getSectionIcon("Node.js");
      const nodeIcon2 = getSectionIcon("nodejs");
      const nodeIcon3 = getSectionIcon("NodeJS");
      const nodeIcon4 = getSectionIcon("node");

      // Node.js should use Node.js icon
      expect(nodeIcon1.icon).toBeDefined();
      expect(nodeIcon2.icon).toBeDefined();
      expect(nodeIcon3.icon).toBeDefined();
      expect(nodeIcon4.icon).toBeDefined();

      // All should return the same result
      expect(nodeIcon1.color).toBe(nodeIcon2.color);
      expect(nodeIcon2.color).toBe(nodeIcon3.color);
      expect(nodeIcon3.color).toBe(nodeIcon4.color);
    });

    it("should handle case variations and special characters", () => {
      const testCases = [
        "Java",
        "java",
        "JAVA",
        "JaVa",
        "Node.js",
        "nodejs",
        "NodeJS",
        "NODE.JS",
        "SDKMAN!",
        "SDKMAN",
        "sdkman",
        "SdkMan",
        "React",
        "react",
        "REACT",
        "ReAcT",
      ];

      testCases.forEach((sectionName) => {
        const icon = getSectionIcon(sectionName);
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });
    });
  });

  describe("Dynamic icon system", () => {
    it("should find Simple Icons for common technologies", () => {
      const testCases = ["Python", "React", "Docker", "MongoDB", "Redis", "GitHub"];

      testCases.forEach((sectionName) => {
        const icon = getSectionIcon(sectionName);
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
        // Should be a data URL (Simple Icon) for these common technologies
        expect(typeof icon.icon).toBe("string");
        expect(icon.icon).toMatch(/^data:image\/svg\+xml/);
      });
    });

    it("should handle variations and special characters", () => {
      const variations = [
        "Node.js",
        "nodejs",
        "NodeJS",
        "NODE.JS",
        "React.js",
        "reactjs",
        "ReactJS",
        "SDKMAN!",
        "SDKMAN",
        "sdkman",
      ];

      variations.forEach((sectionName) => {
        const icon = getSectionIcon(sectionName);
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });
    });

    it("should use semantic fallback for non-brand sections", () => {
      const semanticSections = ["Settings", "Aliases", "Exports", "Functions", "Plugins"];

      semanticSections.forEach((sectionName) => {
        const icon = getSectionIcon(sectionName);
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
        // Should be Raycast icons for semantic categories (strings in our mock)
        expect(typeof icon.icon).toBe("string");
        expect(icon.icon).not.toMatch(/^data:image\/svg\+xml/);
      });
    });

    it("should normalize section names correctly", () => {
      // Test that different formats of the same technology get the same icon
      const pythonVariations = ["Python", "python", "PYTHON"];
      const pythonIcons = pythonVariations.map((name) => getSectionIcon(name));

      // All should have the same color (Python brand color)
      const colors = pythonIcons.map((icon) => icon.color);
      const uniqueColors = [...new Set(colors)];
      expect(uniqueColors.length).toBe(1);
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

  describe("Edge cases and error handling", () => {
    it("should handle empty section names", () => {
      const icon = getSectionIcon("");
      expect(icon.icon).toBeDefined();
      expect(icon.color).toBeDefined();
    });

    it("should handle null and undefined section names", () => {
      // These should throw errors or return default values
      expect(() => getSectionIcon(null as any)).toThrow();
      expect(() => getSectionIcon(undefined as any)).toThrow();
    });

    it("should handle section names with special characters", () => {
      const specialCases = [
        "test-section",
        "test_section",
        "test.section",
        "test/section",
        "test\\section",
        "test(section)",
        "test[section]",
        "test{section}",
        "test<section>",
        "test@section",
        "test#section",
        "test$section",
        "test%section",
        "test^section",
        "test&section",
        "test*section",
        "test+section",
        "test=section",
        "test|section",
        "test~section",
        "test`section",
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
      const numericCases = ["python3", "nodejs16", "java8", "php7", "ruby2", "go1.19", "rust1.70"];

      numericCases.forEach((sectionName) => {
        const icon = getSectionIcon(sectionName);
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });
    });

    it("should handle section names with spaces", () => {
      const spacedCases = [
        "Visual Studio Code",
        "Microsoft Office",
        "Google Chrome",
        "Mozilla Firefox",
        "Adobe Photoshop",
      ];

      spacedCases.forEach((sectionName) => {
        const icon = getSectionIcon(sectionName);
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });
    });

    it("should handle unicode section names", () => {
      const unicodeCases = ["café", "naïve", "résumé", "café-au-lait", "naïve-bayes"];

      unicodeCases.forEach((sectionName) => {
        const icon = getSectionIcon(sectionName);
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });
    });

    it("should handle mixed case and special formatting", () => {
      const mixedCases = [
        "PyThOn",
        "ReAcT.jS",
        "NoDe.Js",
        "JaVaScRiPt",
        "TyPeScRiPt",
        "GoLaNg",
        "RuSt",
        "SwIfT",
        "KoTlIn",
        "DaRt",
      ];

      mixedCases.forEach((sectionName) => {
        const icon = getSectionIcon(sectionName);
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });
    });

    it("should handle section names that are common words", () => {
      const commonWords = [
        "test",
        "config",
        "setup",
        "init",
        "main",
        "core",
        "base",
        "util",
        "helper",
        "service",
        "manager",
        "handler",
        "controller",
        "model",
        "view",
        "component",
        "module",
        "plugin",
        "extension",
        "library",
      ];

      commonWords.forEach((sectionName) => {
        const icon = getSectionIcon(sectionName);
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });
    });

    it("should handle section names with version numbers", () => {
      const versionCases = [
        "python3.9",
        "python3.10",
        "python3.11",
        "nodejs18",
        "nodejs20",
        "java11",
        "java17",
        "java21",
        "php8.0",
        "php8.1",
        "php8.2",
        "ruby3.0",
        "ruby3.1",
        "ruby3.2",
      ];

      versionCases.forEach((sectionName) => {
        const icon = getSectionIcon(sectionName);
        expect(icon.icon).toBeDefined();
        expect(icon.color).toBeDefined();
      });
    });
  });
});
