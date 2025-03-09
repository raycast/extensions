import { describe, beforeEach, expect, it } from "vitest";
import SvgService from "../src/SvgService";

describe("SvgService", () => {
  let svgService: SvgService;

  beforeEach(() => {
    svgService = new SvgService();
  });

  describe("updateKeyColor", () => {
    it("should update the fill color of specified keys to green and text to white", () => {
      svgService.updateKeyColor(["n", "i"]);

      const updatedContent = svgService.svgContent;

      const nKeyGroup = new RegExp(`<g id="n">([\\s\\S]*?)</g>`);
      const iKeyGroup = new RegExp(`<g id="i">([\\s\\S]*?)</g>`);

      const nGroup = updatedContent.match(nKeyGroup)?.[0] || "";
      const iGroup = updatedContent.match(iKeyGroup)?.[0] || "";

      expect(nGroup).toMatch(/<rect class="key"[^>]*?fill="green"/);
      expect(nGroup).toMatch(/<text class="name"[^>]*?fill="white"[^>]*>N<\/text>/);
      expect(nGroup).toMatch(/<text class="annotation"[^>]*?fill="white"[^>]*>iao<\/text>/);

      expect(iGroup).toMatch(/<rect class="key"[^>]*?fill="green"/);
      expect(iGroup).toMatch(/<text class="name"[^>]*?fill="white"[^>]*>I<\/text>/);
      expect(iGroup).toMatch(/<text class="annotation"[^>]*?fill="white"[^>]*>ch<\/text>/);
      expect(iGroup).toMatch(/<text class="annotation"[^>]*?fill="white"[^>]*>i<\/text>/);
    });
  });
});
