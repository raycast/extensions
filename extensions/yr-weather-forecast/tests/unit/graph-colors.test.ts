import {
  GRAPH_COLORS_DARK,
  GRAPH_COLORS_LIGHT,
  getGraphColors,
  type GraphColorPalette,
} from "../../src/config/weather-config";

describe("graph color palettes", () => {
  it("exposes light and dark palettes with the same keys", () => {
    const lightKeys = Object.keys(GRAPH_COLORS_LIGHT).sort();
    const darkKeys = Object.keys(GRAPH_COLORS_DARK).sort();
    expect(darkKeys).toEqual(lightKeys);
  });

  it("uses non-empty string values for all palette entries", () => {
    const palettes: GraphColorPalette[] = [GRAPH_COLORS_LIGHT, GRAPH_COLORS_DARK];
    for (const palette of palettes) {
      for (const value of Object.values(palette)) {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });

  it("selects dark palette only for dark appearance", () => {
    expect(getGraphColors("dark")).toEqual(GRAPH_COLORS_DARK);
    expect(getGraphColors("light")).toEqual(GRAPH_COLORS_LIGHT);
    expect(getGraphColors("system")).toEqual(GRAPH_COLORS_LIGHT);
  });
});
