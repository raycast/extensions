import { directionFromDegrees } from "../../src/weather-utils";

describe("directionFromDegrees", () => {
  it.each([
    [0, "N", "↑"],
    [45, "NE", "↗"],
    [90, "E", "→"],
    [135, "SE", "↘"],
    [180, "S", "↓"],
    [225, "SW", "↙"],
    [270, "W", "←"],
    [315, "NW", "↖"],
  ])("%i° -> %s / %s", (degrees, name, arrow) => {
    const result = directionFromDegrees(degrees);
    expect(result.name).toBe(name);
    expect(result.arrow).toBe(arrow);
  });

  it("360° wraps to North", () => {
    const result = directionFromDegrees(360);
    expect(result.name).toBe("N");
  });

  it("negative degrees are normalised (e.g. -90 is W)", () => {
    const result = directionFromDegrees(-90);
    expect(result.name).toBe("W");
  });

  it("degrees > 360 are normalised (e.g. 405 is NE)", () => {
    const result = directionFromDegrees(405);
    expect(result.name).toBe("NE");
  });
});
