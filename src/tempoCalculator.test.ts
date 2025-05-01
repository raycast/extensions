import { expect, test, describe } from "vitest";
import {
  calculateBPM,
  updateTapData,
  TapData,
  createIntervals,
  calculateAverage,
  intervalToBPM,
  addTimestamp,
  smoothBPM,
  DEFAULT_CONFIG,
  TempoConfig,
} from "./tempoCalculator";

describe("createIntervals", () => {
  test("returns empty array for empty input", () => {
    expect(createIntervals([])).toEqual([]);
  });

  test("returns empty array for single timestamp", () => {
    expect(createIntervals([1000])).toEqual([]);
  });

  test("calculates correct intervals for consecutive timestamps", () => {
    const timestamps = [1000, 1500, 2200, 2800];
    expect(createIntervals(timestamps)).toEqual([500, 700, 600]);
  });
});

describe("calculateAverage", () => {
  test("returns 0 for empty array", () => {
    expect(calculateAverage([])).toBe(0);
  });

  test("calculates average for single value", () => {
    expect(calculateAverage([5])).toBe(5);
  });

  test("calculates average for multiple values", () => {
    expect(calculateAverage([2, 4, 6, 8])).toBe(5);
  });

  test("handles decimal values", () => {
    expect(calculateAverage([1.5, 2.5, 3.5])).toBe(2.5);
  });
});

describe("intervalToBPM", () => {
  test("converts 500ms interval to 120 BPM", () => {
    expect(intervalToBPM(500)).toBe(120);
  });

  test("converts 1000ms interval to 60 BPM", () => {
    expect(intervalToBPM(1000)).toBe(60);
  });

  test("converts 250ms interval to 240 BPM", () => {
    expect(intervalToBPM(250)).toBe(240);
  });

  test("rounds to specified decimal places", () => {
    // Default (2 decimal places)
    expect(intervalToBPM(603)).toBe(99.5);

    // 1 decimal place
    expect(intervalToBPM(603, 1)).toBe(99.5);

    // 0 decimal places
    expect(intervalToBPM(603, 0)).toBe(100);
  });
});

describe("smoothBPM", () => {
  test("returns null if new BPM is null", () => {
    expect(smoothBPM(null, 120, 0.3)).toBeNull();
  });

  test("returns new BPM if previous BPM is null", () => {
    expect(smoothBPM(120, null, 0.3)).toBe(120);
  });

  test("applies no smoothing with smoothingFactor of 0", () => {
    expect(smoothBPM(120, 100, 0)).toBe(120);
  });

  test("applies maximum smoothing with smoothingFactor of 1", () => {
    expect(smoothBPM(120, 100, 1)).toBe(100);
  });

  test("applies moderate smoothing", () => {
    // With 0.3 smoothing factor:
    // newValue = (1-0.3) * 120 + 0.3 * 100 = 0.7 * 120 + 0.3 * 100 = 84 + 30 = 114
    expect(smoothBPM(120, 100, 0.3)).toBe(114);
  });

  test("handles out of range smoothing factor", () => {
    // Should clamp to range 0-1
    expect(smoothBPM(120, 100, -0.5)).toBe(120); // Treats as 0
    expect(smoothBPM(120, 100, 1.5)).toBe(100); // Treats as 1
  });

  test("rounds to specified decimal places", () => {
    // With smoothing that would produce 114.28571...
    // Default (2 decimal places)
    expect(smoothBPM(123.4, 95.2, 0.3)).toBe(114.94);

    // 1 decimal place
    expect(smoothBPM(123.4, 95.2, 0.3, 1)).toBe(114.9);

    // 0 decimal places
    expect(smoothBPM(123.4, 95.2, 0.3, 0)).toBe(115);
  });
});

describe("addTimestamp", () => {
  test("adds timestamp to empty array", () => {
    expect(addTimestamp([], 1000, 10)).toEqual([1000]);
  });

  test("adds timestamp to existing array", () => {
    expect(addTimestamp([1000, 1500], 2000, 10)).toEqual([1000, 1500, 2000]);
  });

  test("respects maxTaps limit", () => {
    const timestamps = [1000, 1500, 2000, 2500, 3000];
    expect(addTimestamp(timestamps, 3500, 3)).toEqual([2500, 3000, 3500]);
  });

  test("does not modify original array", () => {
    const original = [1000, 1500];
    const result = addTimestamp(original, 2000, 10);
    expect(result).not.toBe(original); // Should be a new array
    expect(original).toEqual([1000, 1500]); // Original unchanged
  });
});

describe("calculateBPM", () => {
  test("returns null for empty array", () => {
    expect(calculateBPM([])).toBeNull();
  });

  test("returns null for single timestamp", () => {
    expect(calculateBPM([1000])).toBeNull();
  });

  test("calculates correct BPM for consistent intervals", () => {
    // 500ms between taps = 120 BPM
    const timestamps = [1000, 1500, 2000, 2500, 3000];
    expect(calculateBPM(timestamps)).toBe(120);
  });

  test("calculates with custom decimal places", () => {
    const timestamps = [1000, 1580, 2200, 2790, 3410];

    // Default (2 decimal places)
    expect(calculateBPM(timestamps)).toBeCloseTo(99.59, 2);

    // 1 decimal place
    const config: TempoConfig = { ...DEFAULT_CONFIG, decimalPlaces: 1 };
    expect(calculateBPM(timestamps, config)).toBeCloseTo(99.6, 1);

    // 0 decimal places
    const intConfig: TempoConfig = { ...DEFAULT_CONFIG, decimalPlaces: 0 };
    expect(calculateBPM(timestamps, intConfig)).toBe(100);
  });
});

describe("updateTapData", () => {
  test("adds a timestamp to empty data", () => {
    const initialData: TapData = { timestamps: [], bpm: null, rawBpm: null };
    const result = updateTapData(initialData, 1000);

    expect(result.timestamps).toEqual([1000]);
    expect(result.bpm).toBeNull();
    expect(result.rawBpm).toBeNull();
  });

  test("adds a timestamp and calculates BPM", () => {
    const initialData: TapData = { timestamps: [1000], bpm: null, rawBpm: null };
    const result = updateTapData(initialData, 1500);

    expect(result.timestamps).toEqual([1000, 1500]);
    expect(result.bpm).toBe(120);
    expect(result.rawBpm).toBe(120);
  });

  test("respects the maxTaps limit from config", () => {
    const initialData: TapData = {
      timestamps: [1000, 1500, 2000, 2500, 3000],
      bpm: 120,
      rawBpm: 120,
    };

    const config: TempoConfig = { ...DEFAULT_CONFIG, maxTaps: 3 };
    const result = updateTapData(initialData, 3500, config);

    // Should only keep the last 3 timestamps (including the new one)
    expect(result.timestamps).toEqual([2500, 3000, 3500]);
    expect(result.bpm).toBe(120);
    expect(result.rawBpm).toBe(120);
  });

  test("applies smoothing to BPM values", () => {
    const initialData: TapData = {
      timestamps: [1000, 1500],
      bpm: 120,
      rawBpm: 120,
    };

    // Add timestamp that would change raw BPM to 100
    // With default smoothing of 0.3, expect smoothed BPM to be:
    // 0.7 * 100 + 0.3 * 120 = 70 + 36 = 106
    const result = updateTapData(initialData, 2200);

    expect(result.timestamps).toEqual([1000, 1500, 2200]);
    expect(result.rawBpm).toBe(100);
    expect(result.bpm).toBe(106);
  });

  test("uses custom smoothing factor from config", () => {
    const initialData: TapData = {
      timestamps: [1000, 1500],
      bpm: 120,
      rawBpm: 120,
    };

    // With smoothing of 0.5, expect smoothed BPM to be:
    // 0.5 * 100 + 0.5 * 120 = 50 + 60 = 110
    const config: TempoConfig = { ...DEFAULT_CONFIG, smoothingFactor: 0.5 };
    const result = updateTapData(initialData, 2200, config);

    expect(result.rawBpm).toBe(100);
    expect(result.bpm).toBe(110);
  });

  test("applies correct decimal place rounding to smoothed values", () => {
    const initialData: TapData = {
      timestamps: [1000, 1500],
      bpm: 120,
      rawBpm: 120,
    };

    // A configuration that would produce a non-integer result
    const config: TempoConfig = {
      ...DEFAULT_CONFIG,
      smoothingFactor: 0.3,
      decimalPlaces: 1, // 1 decimal place
    };

    // Would be 106, but with 1 decimal place might show more precision
    const result = updateTapData(initialData, 2200, config);

    expect(result.rawBpm).toBe(100);
    // Should be rounded to 1 decimal place
    expect(result.bpm).toBe(106.0);

    // Test with 0 decimal places
    const intConfig: TempoConfig = {
      ...DEFAULT_CONFIG,
      smoothingFactor: 0.3,
      decimalPlaces: 0,
    };

    const intResult = updateTapData(initialData, 2200, intConfig);
    expect(intResult.bpm).toBe(106);
  });
});
