import { calculateVolume } from "../volume";
import { VOLUME_SCHEMES } from "../../constants/volume";
import { VALIDATION } from "../../constants/shared";

describe("calculateVolume", () => {
  test("calculates volumes for all training goals", () => {
    const oneRepMax = 200;
    const results = calculateVolume(oneRepMax);

    // Verify that we get results for each volume scheme
    expect(results.length).toBe(VOLUME_SCHEMES.length);

    // Check that each result has the expected properties
    results.forEach((result) => {
      expect(result).toHaveProperty("goal");
      expect(result).toHaveProperty("scheme");
      expect(result).toHaveProperty("weight");
      expect(result).toHaveProperty("totalReps");
      expect(result).toHaveProperty("totalVolume");
      expect(result).toHaveProperty("description");
    });
  });

  test("computes total volume correctly", () => {
    const oneRepMax = 200;
    const results = calculateVolume(oneRepMax);

    results.forEach((result) => {
      // Verify that total volume is correctly calculated
      const expectedVolume = result.weight * result.totalReps;
      expect(result.totalVolume).toBe(expectedVolume);

      // Verify that total reps is sets * reps
      expect(result.totalReps).toBe(result.scheme.sets * result.scheme.reps);
    });
  });

  test("validates 1RM input", () => {
    // Test lower bound validation
    expect(() => calculateVolume(VALIDATION.WEIGHT.MIN - 1)).toThrow(VALIDATION.getWeightError());

    // Test upper bound validation
    expect(() => calculateVolume(VALIDATION.WEIGHT.MAX + 1)).toThrow(VALIDATION.getWeightError());

    // Test valid input at boundaries
    expect(() => calculateVolume(VALIDATION.WEIGHT.MIN)).not.toThrow();
    expect(() => calculateVolume(VALIDATION.WEIGHT.MAX)).not.toThrow();
  });

  test("rounds weights appropriately", () => {
    const oneRepMax = 183; // An arbitrary number to test rounding
    const results = calculateVolume(oneRepMax);

    results.forEach((result) => {
      // Check that the weight is a multiple of 5
      expect(result.weight % 5).toBe(0);

      // Verify that rounding is done correctly
      const exactWeight = oneRepMax * result.scheme.percentage;
      const roundedWeight = result.weight;

      // Rounding should be to the nearest 5
      expect(Math.abs(exactWeight - roundedWeight)).toBeLessThanOrEqual(2.5);
    });
  });
});
