import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Metadata Wrapping", () => {
  describe("metadata structure", () => {
    const srcPath = join(__dirname, "..");

    it("should wrap metadata in List.Item.Detail.Metadata component for aliases", () => {
      const aliasesSource = readFileSync(join(srcPath, "aliases.tsx"), "utf-8");
      expect(aliasesSource).toContain("<List.Item.Detail.Metadata>");
      expect(aliasesSource).not.toMatch(/generateMetadata=\{.*?<>.*?\}/s);
    });

    it("should wrap metadata in List.Item.Detail.Metadata component for exports", () => {
      const exportsSource = readFileSync(join(srcPath, "exports.tsx"), "utf-8");
      expect(exportsSource).toContain("<List.Item.Detail.Metadata>");
      expect(exportsSource).not.toMatch(/generateMetadata=\{.*?<>.*?\}/s);
    });

    it("should wrap metadata in List.Item.Detail.Metadata component for functions", () => {
      const functionsSource = readFileSync(join(srcPath, "functions.tsx"), "utf-8");
      expect(functionsSource).toContain("<List.Item.Detail.Metadata>");
      expect(functionsSource).not.toMatch(/generateMetadata=\{.*?<>.*?\}/s);
    });

    it("should wrap metadata in List.Item.Detail.Metadata component for plugins", () => {
      const pluginsSource = readFileSync(join(srcPath, "plugins.tsx"), "utf-8");
      expect(pluginsSource).toContain("<List.Item.Detail.Metadata>");
      expect(pluginsSource).not.toMatch(/generateMetadata=\{.*?<>.*?\}/s);
    });

    it("should wrap metadata in List.Item.Detail.Metadata component for sources", () => {
      const sourcesSource = readFileSync(join(srcPath, "sources.tsx"), "utf-8");
      expect(sourcesSource).toContain("<List.Item.Detail.Metadata>");
      expect(sourcesSource).not.toMatch(/generateMetadata=\{.*?<>.*?\}/s);
    });

    it("should wrap metadata in List.Item.Detail.Metadata component for evals", () => {
      const evalsSource = readFileSync(join(srcPath, "evals.tsx"), "utf-8");
      expect(evalsSource).toContain("<List.Item.Detail.Metadata>");
      expect(evalsSource).not.toMatch(/generateMetadata=\{.*?<>.*?\}/s);
    });

    it("should wrap metadata in List.Item.Detail.Metadata component for setopts", () => {
      const setoptsSource = readFileSync(join(srcPath, "setopts.tsx"), "utf-8");
      expect(setoptsSource).toContain("<List.Item.Detail.Metadata>");
      expect(setoptsSource).not.toMatch(/generateMetadata=\{.*?<>.*?\}/s);
    });
  });
});
