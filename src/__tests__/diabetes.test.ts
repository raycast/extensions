import { getValueColor } from "../utils/glucose";

describe("Glucose Calculations", () => {
  it("should return yellow for low values", () => {
    expect(getValueColor(3.8, "mmol")).toBe("#EAB308");
    expect(getValueColor(69, "mgdl")).toBe("#EAB308");
  });

  it("should return green for normal values", () => {
    expect(getValueColor(5.5, "mmol")).toBe("#10B981");
    expect(getValueColor(100, "mgdl")).toBe("#10B981");
  });

  it("should return red for high values", () => {
    expect(getValueColor(10.1, "mmol")).toBe("#EF4444");
    expect(getValueColor(181, "mgdl")).toBe("#EF4444");
  });
});
