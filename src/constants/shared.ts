// constants/shared.ts

// Input validation ranges and patterns
export const VALIDATION = {
  WEIGHT: {
    MIN: 0, // Check if this should be > 0
    MAX: 1000,
    PATTERN: /^(\d+(?:\.\d+)?)\*(\d+)$/,
  },
  REPS: {
    MIN: 1,
    MAX: 100,
  },
  getWeightError: () => `Weight must be between ${VALIDATION.WEIGHT.MIN} and ${VALIDATION.WEIGHT.MAX}`,
  getRepsError: () => `Reps must be between ${VALIDATION.REPS.MIN} and ${VALIDATION.REPS.MAX}`,
} as const;

// Unit conversion factors
export const UNITS = {
  CONVERSION: {
    KG_TO_LBS: 2.20462,
    LBS_TO_KG: 0.453592,
  },
  PRECISION: {
    DISPLAY: 1, // For displaying weights to users
    CALC: 4, // For internal calculations
  },
  INCREMENTS: {
    KG: 2.5, // Standard kg plate increment
    LBS: 5, // Standard lbs plate increment
  },
} as const;

// Epley formula constants
export const EPLEY = {
  COEFFICIENT_A: 1.0278,
  COEFFICIENT_B: 0.0278,
} as const;

// External resource links
export const RESOURCES = {
  LINKS: {
    WIKI: "https://en.wikipedia.org/wiki/One-repetition_maximum",
    EPLEY_FORMULA: "https://en.wikipedia.org/wiki/One-repetition_maximum#Epley_formula",
  },
  DOCS: {
    WARMUP: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4482302/",
    TRAINING: "https://pubmed.ncbi.nlm.nih.gov/34755829/",
  },
} as const;
