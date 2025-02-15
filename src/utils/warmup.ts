// utils/warmup.ts
import { WarmupSet } from "../types/warmup";
import { WARMUP_SCHEMES } from "../constants/warmup";
import { VALIDATION, UNITS } from "../constants/shared";

export const calculateWarmupSets = (workingWeight: number): WarmupSet[] => {
  if (workingWeight < VALIDATION.WEIGHT.MIN || workingWeight > VALIDATION.WEIGHT.MAX) {
    throw new Error(VALIDATION.getWeightError());
  }

  return WARMUP_SCHEMES.map((scheme, index) => {
    // Round to nearest plate increment
    const rawWeight = workingWeight * scheme.percentage;
    const increment = UNITS.INCREMENTS.KG;
    const weight = Math.round(rawWeight / increment) * increment;

    return {
      setNumber: index + 1,
      weight,
      reps: scheme.reps,
      percentage: scheme.percentage,
      isWorkingSet: scheme.percentage === 1.0,
    };
  });
};
