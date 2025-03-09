import path from "node:path";
import * as fs from "node:fs";

export default class SvgService {
  svgPath: string;
  private _svgContent: string;

  constructor() {
    // Handle both test and Raycast environments
    const isTest = process.env.NODE_ENV === "test";
    this.svgPath = isTest
      ? path.resolve(__dirname, "../assets/xiaohe_keyboard.svg")
      : path.resolve(__dirname, "./assets/xiaohe_keyboard.svg");
    this._svgContent = this.readSvgFile();
  }

  private readSvgFile(): string {
    const content = fs.readFileSync(this.svgPath, "utf8");
    return content.trim();
  }

  get svgContent(): string {
    return this._svgContent;
  }

  updateKeyColor(keys: string[]): void {
    let content = this._svgContent;

    for (const key of keys) {
      const keyPattern = new RegExp(`<g id="${key}">([\\s\\S]*?)</g>`, "g");
      const rectPattern = /<rect class="key"[^>]*?fill="white"/g;
      const namePattern = /<text class="name"[^>]*?fill="black"/g;
      const annotationPattern = /<text class="annotation"[^>]*?fill="blue"/g;

      content = content.replace(keyPattern, (match) => {
        return match
          .replace(rectPattern, (rect) => rect.replace('fill="white"', 'fill="green"'))
          .replace(namePattern, (text) => text.replace('fill="black"', 'fill="white"'))
          .replace(annotationPattern, (text) => text.replace('fill="blue"', 'fill="white"'));
      });
    }

    this._svgContent = content;
  }

  getImgSrcData(): string {
    let svgContent = this._svgContent;

    if (!svgContent.includes("xmlns=")) {
      svgContent = svgContent.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const encodedSvg = encodeURIComponent(svgContent).replace(/'/g, "%27").replace(/"/g, "%22");

    return `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
  }
}
