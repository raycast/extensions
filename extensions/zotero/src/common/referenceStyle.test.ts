import { readFileSync } from "fs";
import path = require("path");
import { describe, expect, it } from "vitest";
import Cite from "citation-js";
import { formatReference, getReferenceTemplate } from "./referenceStyle";

const installed = getReferenceTemplate({ zotero_path: "~/Zotero/zotero.sqlite", csl_style: "ieee" });
const custom = getReferenceTemplate({
  zotero_path: "~/Zotero/zotero.sqlite",
  csl_source: "custom",
  custom_csl_path: " ~/styles/example.CSL ",
});
const locales = Object.fromEntries(
  ["zh-CN", "ja-JP"].map((locale) => [
    locale,
    readFileSync(path.join(process.cwd(), "assets", "locales", `locales-${locale}.xml`), "utf8"),
  ]),
);
const item = { id: "example", type: "book", title: "Sample Book" };

function style(content = '<text variable="title"/>', language = "en-US", overrides = "") {
  return `<style xmlns="http://purl.org/net/xbiblio/csl" class="note" version="1.0" default-locale="${language}">
    <info><title>Example</title><id>example</id><updated>2026-01-01T00:00:00Z</updated></info>
    ${overrides}
    <citation><layout prefix="NOTE: ">${content}</layout></citation>
    <bibliography et-al-min="3" et-al-use-first="1"><layout prefix="BIB: ">${content}</layout></bibliography>
  </style>`;
}

describe("style selection and backward compatibility", () => {
  it("uses the installed selection and ignores a custom path until explicitly enabled", () => {
    expect(getReferenceTemplate({ zotero_path: "~/Zotero/zotero.sqlite", custom_csl_path: "~/other.csl" })).toEqual({
      path: "~/Zotero/styles/ieee.csl",
      name: "ieee",
      custom: false,
    });
    expect(custom.path).toBe("~/styles/example.CSL");
  });

  it.each([undefined, " ", "~/styles/readme.txt"])("rejects invalid custom paths: %s", (custom_csl_path) => {
    expect(() => getReferenceTemplate({ zotero_path: "~/db.sqlite", csl_source: "custom", custom_csl_path })).toThrow(
      "Custom CSL File",
    );
  });

  it("keeps bibliography output even for note styles unless Note is selected", () => {
    expect(formatReference(item, style(), installed)).toBe("BIB: Sample Book\n");
    expect(formatReference(item, style(), custom, undefined, locales)).toBe("BIB: Sample Book\n");
    expect(formatReference(item, style(), custom, "note", locales)).toBe("NOTE: Sample Book");
    expect(formatReference(item, style(), installed, "note")).toBe("NOTE: Sample Book");
  });

  it("rejects Note for in-text styles with an actionable message", () => {
    const inText = style().replace('class="note"', 'class="in-text"');
    expect(() => formatReference(item, inText, custom, "note", locales)).toThrow("Note output requires a note-based");
    expect(() => formatReference(item, `<!-- <style class="note"> -->${inText}`, custom, "note", locales)).toThrow(
      "Note output requires a note-based",
    );
  });

  it("picks up changes to the same custom file and does not collide on filenames", () => {
    expect(formatReference(item, style('<text value="First"/>'), custom, "note", locales)).toBe("NOTE: First");
    expect(formatReference(item, style('<text value="Changed"/>'), custom, "note", locales)).toBe("NOTE: Changed");
    const other = { ...custom, path: "~/other/example.CSL" };
    expect(formatReference(item, style('<text value="Other"/>'), other, "note", locales)).toBe("NOTE: Other");
  });
});

describe("scoped Chinese and Japanese locales", () => {
  const content = `<group delimiter="; ">
    <names variable="author"><name/><et-al/></names>
    <group><number variable="volume"/><label variable="volume" form="short"/></group>
    <group><number variable="issue"/><label variable="issue" form="short"/></group>
    <date variable="issued" form="text"/>
  </group>`;
  const datedItem = {
    ...item,
    volume: "13",
    issue: "2",
    issued: { "date-parts": [[2026, 10, 28]] },
    author: [{ literal: "张三" }, { literal: "李四" }, { literal: "王五" }],
  };

  it("renders Chinese et-al, volume, issue and a localized text date", () => {
    expect(formatReference(datedItem, style(content, "zh-CN"), custom, "bibliography", locales)).toBe(
      "BIB: 张三等; 13卷; 2期; 2026年10月28日\n",
    );
  });

  it("renders Japanese et-al, volume, issue and a localized text date", () => {
    const japanese = {
      ...datedItem,
      author: [{ literal: "山田太郎" }, { literal: "田中花子" }, { literal: "鈴木一郎" }],
    };
    expect(formatReference(japanese, style(content, "ja-JP"), custom, "bibliography", locales)).toBe(
      "BIB: 山田太郎ほか; 13巻; 2号; 2026年10月28日\n",
    );
  });

  it("preserves inline locale terms and dates rather than rewriting the CSL file", () => {
    const xml = style(
      content,
      "zh-CN",
      `<locale xml:lang="zh"><date form="text"><date-part name="year" suffix="年度"/></date>
      <terms><term name="et-al">及他人</term><term name="volume" form="short">册</term></terms></locale>`,
    );
    expect(formatReference(datedItem, xml, custom, "bibliography", locales)).toBe(
      "BIB: 张三及他人; 13册; 2期; 2026年度\n",
    );
  });

  it("does not add or overwrite locales for subsequent installed-style calls", () => {
    const registry = Cite.plugins.config.get("@csl").locales;
    const before = ["zh-CN", "ja-JP"].map((locale) => [registry.has(locale), registry.get(locale)]);
    const original = formatReference(datedItem, style(content, "zh-CN"), installed);
    formatReference(datedItem, style(content, "zh-CN"), custom, "bibliography", locales);
    expect(["zh-CN", "ja-JP"].map((locale) => [registry.has(locale), registry.get(locale)])).toEqual(before);
    expect(formatReference(datedItem, style(content, "zh-CN"), installed)).toBe(original);
  });

  it("restores existing registered locales even when custom formatting fails", () => {
    const registry = Cite.plugins.config.get("@csl").locales;
    const had = registry.has("zh-CN");
    const prior = registry.get("zh-CN");
    registry.add("zh-CN", "existing locale");
    try {
      const noBibliography = style().replace(/<bibliography[\s\S]*?<\/bibliography>/, "");
      expect(() => formatReference(item, noBibliography, custom, "bibliography", locales)).toThrow();
      expect(registry.get("zh-CN")).toBe("existing locale");
    } finally {
      if (had) registry.add("zh-CN", prior);
      else registry.remove("zh-CN");
    }
  });
});
