// integration/__tests__/commands.test.ts
import { getPreferenceValues } from "@raycast/api";
import { calculateOneRepMax, generateResults } from "../../src/utils/calculations";
import { calculateWarmupSets } from "../../src/utils/warmup";
import { calculateVolume } from "../../src/utils/volume";
import { VALIDATION } from "../../src/constants/shared";

describe("lift-max command", () => {
  beforeEach(() => {
    (getPreferenceValues as jest.Mock).mockReturnValue({ unitSystem: "kg" });
  });

  test("handles valid input arguments", () => {
    const weight = "100";
    const reps = "5";

    const maxWeight = calculateOneRepMax(parseFloat(weight), parseInt(reps));
    const results = generateResults(maxWeight);

    expect(results).toHaveLength(7); // We have 7 schemes defined
    expect(results[0].value).toBeGreaterThan(parseFloat(weight)); // 1RM should be higher than input weight
    expect(results[0].percentage).toBe(1.0); // First result should be 100%
  });

  test("handles invalid inputs", () => {
    expect(() => calculateOneRepMax(-100, 5)).toThrow();
    expect(() => calculateOneRepMax(100, -5)).toThrow();
    expect(() => calculateOneRepMax(0, 5)).toThrow();
  });

  test("respects unit system preference", () => {
    // Test with kg
    (getPreferenceValues as jest.Mock).mockReturnValue({ unitSystem: "kg" });
    const resultsKg = generateResults(100);

    // Test with lbs
    (getPreferenceValues as jest.Mock).mockReturnValue({ unitSystem: "lbs" });
    const resultsLbs = generateResults(100);

    // Results should be the same regardless of unit system
    expect(resultsKg[0].value).toBe(resultsLbs[0].value);
  });
});

describe("lift-warmup command", () => {
  beforeEach(() => {
    (getPreferenceValues as jest.Mock).mockReturnValue({ unitSystem: "kg" });
  });

  test("generates correct number of warmup sets", () => {
    const workingWeight = 100;
    const sets = calculateWarmupSets(workingWeight);

    expect(sets.length).toBeGreaterThan(0);
    expect(sets[sets.length - 1].percentage).toBe(1.0); // Last set should be working weight
    expect(sets[sets.length - 1].weight).toBe(workingWeight);
  });

  test("handles weight validation", () => {
    expect(() => calculateWarmupSets(-100)).toThrow(VALIDATION.getWeightError());
    expect(() => calculateWarmupSets(0)).toThrow(VALIDATION.getWeightError());
    expect(() => calculateWarmupSets(VALIDATION.WEIGHT.MAX + 1)).toThrow(VALIDATION.getWeightError());
  });

  test("maintains ascending weight progression", () => {
    const sets = calculateWarmupSets(100);
    let previousWeight = -1;

    sets.forEach((set) => {
      expect(set.weight).toBeGreaterThan(previousWeight);
      previousWeight = set.weight;
    });
  });
});

describe("lift-volume command", () => {
  beforeEach(() => {
    (getPreferenceValues as jest.Mock).mockReturnValue({ unitSystem: "kg" });
  });

  test("generates schemes for all training goals", () => {
    const maxWeight = 100;
    const results = calculateVolume(maxWeight);

    const goals = results.map((r) => r.goal);
    expect(goals).toContain("strength");
    expect(goals).toContain("power");
    expect(goals).toContain("hypertrophy");
    expect(goals).toContain("endurance");
  });

  test("calculates correct volume loads", () => {
    const maxWeight = 100;
    const results = calculateVolume(maxWeight);

    results.forEach((result) => {
      const expectedVolume = result.weight * result.scheme.sets * result.scheme.reps;
      expect(result.totalVolume).toBe(expectedVolume);
    });
  });

  test("handles weight validation", () => {
    expect(() => calculateVolume(-100)).toThrow(VALIDATION.getWeightError());
    expect(() => calculateVolume(0)).toThrow(VALIDATION.getWeightError());
    expect(() => calculateVolume(VALIDATION.WEIGHT.MAX + 1)).toThrow(VALIDATION.getWeightError());
  });
});
