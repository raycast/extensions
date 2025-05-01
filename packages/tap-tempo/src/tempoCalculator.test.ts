import { expect, test, describe } from "vitest";
import {
  calculateBPM,
  calculatePreciseBPM,
  updateTapData,
  TapData,
  createIntervals,
  calculateAverage,
  calculateVariance,
  calculateMedian,
  intervalToBPM,
  roundToDecimalPlaces,
  addTimestamp,
  detectTempoChange,
  isAfterPause,
  smoothBPM,
  calculateDynamicSmoothing,
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

describe("calculateVariance", () => {
  test("returns 0 for empty array", () => {
    expect(calculateVariance([])).toBe(0);
  });

  test("returns 0 for single value", () => {
    expect(calculateVariance([5])).toBe(0);
  });

  test("calculates variance for consistent values", () => {
    expect(calculateVariance([5, 5, 5, 5])).toBe(0);
  });

  test("calculates variance for varied values", () => {
    // Variance of [2, 4, 6, 8] = 5
    // Avg = 5, squared diffs = [9, 1, 1, 9], avg = 5
    expect(calculateVariance([2, 4, 6, 8])).toBe(5);
  });
});

describe("calculateMedian", () => {
  test("returns null for empty array", () => {
    expect(calculateMedian([])).toBeNull();
  });

  test("returns the value for single item array", () => {
    expect(calculateMedian([5])).toBe(5);
  });

  test("calculates median for odd length array", () => {
    expect(calculateMedian([1, 5, 3])).toBe(3);
  });

  test("calculates median for even length array", () => {
    expect(calculateMedian([1, 3, 5, 7])).toBe(4);
  });
});

describe("detectTempoChange", () => {
  // Mock config for tests
  const config: TempoConfig = {
    ...DEFAULT_CONFIG,
    minTapsForConfidence: 4,
    tempoChangeThreshold: 1.8,
    pauseThreshold: 1500,
  };

  test("returns false with too few intervals", () => {
    const intervals = [500, 500];
    const recentIntervals = [500, 500];
    expect(detectTempoChange(intervals, recentIntervals, 500, config)).toBe(false);
  });

  test("detects pause as tempo change", () => {
    const intervals = [500, 500, 500, 500];
    const recentIntervals = [500, 500, 2000];
    expect(detectTempoChange(intervals, recentIntervals, 2000, config)).toBe(true);
  });

  test("detects double-time change", () => {
    const intervals = [500, 500, 500, 500, 500];
    const recentIntervals = [500, 500, 250];
    expect(detectTempoChange(intervals, recentIntervals, 250, config)).toBe(true);
  });

  test("detects half-time change", () => {
    const intervals = [500, 500, 500, 500, 500];
    const recentIntervals = [500, 500, 1000];
    expect(detectTempoChange(intervals, recentIntervals, 1000, config)).toBe(true);
  });

  test("does not detect small variations as tempo changes", () => {
    const intervals = [500, 500, 500, 500, 500];
    const recentIntervals = [500, 500, 550];
    expect(detectTempoChange(intervals, recentIntervals, 550, config)).toBe(false);
  });
});

describe("isAfterPause", () => {
  test("returns false for empty timestamps", () => {
    expect(isAfterPause([], 1000, 1000)).toBe(false);
  });

  test("returns true if time since last tap exceeds pause threshold", () => {
    expect(isAfterPause([1000], 3000, 1500)).toBe(true);
  });

  test("returns false if time since last tap is below pause threshold", () => {
    expect(isAfterPause([1000], 2000, 1500)).toBe(false);
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

  test("returns precise value without rounding", () => {
    // 603ms should be precisely 99.5024... BPM
    expect(intervalToBPM(603)).toBeCloseTo(99.50249, 4);
  });
});

describe("roundToDecimalPlaces", () => {
  test("rounds to 2 decimal places by default", () => {
    expect(roundToDecimalPlaces(99.5024, 2)).toBe(99.5);
  });

  test("rounds to 1 decimal place", () => {
    expect(roundToDecimalPlaces(99.5024, 1)).toBe(99.5);
  });

  test("rounds to 0 decimal places", () => {
    expect(roundToDecimalPlaces(99.5024, 0)).toBe(100);
  });

  test("rounds properly at the boundary", () => {
    expect(roundToDecimalPlaces(99.499, 1)).toBe(99.5);
    expect(roundToDecimalPlaces(99.449, 1)).toBe(99.4);
  });
});

describe("calculateDynamicSmoothing", () => {
  test("returns low smoothing when tempo change detected", () => {
    const baseSmoothing = 0.5;
    const tapCount = 10;
    const tempoChangeDetected = true;
    const result = calculateDynamicSmoothing(baseSmoothing, tapCount, null, tempoChangeDetected, DEFAULT_CONFIG);
    expect(result).toBeLessThan(0.2); // Should be very low
  });

  test("returns base smoothing for few taps", () => {
    const baseSmoothing = 0.5;
    const tapCount = 3; // Less than minTapsForConfidence
    const tempoChangeDetected = false;
    expect(calculateDynamicSmoothing(baseSmoothing, tapCount, null, tempoChangeDetected, DEFAULT_CONFIG)).toBe(
      baseSmoothing,
    );
  });

  test("reduces smoothing for more taps", () => {
    const baseSmoothing = 0.5;
    const tapCount = 10; // More than minTapsForConfidence
    const tempoChangeDetected = false;
    const result = calculateDynamicSmoothing(baseSmoothing, tapCount, null, tempoChangeDetected, DEFAULT_CONFIG);
    expect(result).toBeLessThan(baseSmoothing);
  });

  test("reduces smoothing for low variance", () => {
    const baseSmoothing = 0.5;
    const tapCount = 10;
    const lowVariance = DEFAULT_CONFIG.varianceThreshold * 0.1; // 10% of threshold
    const tempoChangeDetected = false;
    const result = calculateDynamicSmoothing(baseSmoothing, tapCount, lowVariance, tempoChangeDetected, DEFAULT_CONFIG);

    // Should be less than just the tap count reduction
    const tapOnlyResult = calculateDynamicSmoothing(baseSmoothing, tapCount, null, tempoChangeDetected, DEFAULT_CONFIG);
    expect(result).toBeLessThan(tapOnlyResult);
  });
});

describe("smoothBPM", () => {
  test("returns null if new BPM is null", () => {
    expect(smoothBPM(null, 120, 5, null, false, DEFAULT_CONFIG)).toBeNull();
  });

  test("returns new BPM if previous BPM is null", () => {
    expect(smoothBPM(120, null, 5, null, false, DEFAULT_CONFIG)).toBe(120);
  });

  test("uses less smoothing when tempo change detected", () => {
    const newBpm = 120;
    const prevBpm = 60;
    const tapCount = 5;
    const variance = 1000;

    // With tempo change detected
    const tempoChangeResult = smoothBPM(newBpm, prevBpm, tapCount, variance, true, DEFAULT_CONFIG);

    // Without tempo change detected
    const normalResult = smoothBPM(newBpm, prevBpm, tapCount, variance, false, DEFAULT_CONFIG);

    if (tempoChangeResult !== null && normalResult !== null) {
      // The tempo change result should be different from the normal result
      expect(tempoChangeResult).not.toEqual(normalResult);

      // It should apply some kind of special handling for tempo changes
      expect(tempoChangeResult).toBeCloseTo(108, 0);

      // Check that it's somewhere between the old and new BPM
      expect(tempoChangeResult).toBeGreaterThan(prevBpm);
      expect(tempoChangeResult).toBeLessThan(newBpm);
    }
  });

  test("applies minimal smoothing with many consistent taps", () => {
    const config = { ...DEFAULT_CONFIG, smoothingFactor: 0.5 };
    const tapCount = 20; // Many taps
    const lowVariance = 100; // Very consistent
    const tempoChangeDetected = false;

    // Should approach raw BPM more closely than with default smoothing
    const result = smoothBPM(120, 100, tapCount, lowVariance, tempoChangeDetected, config);

    // Result should be closer to the new BPM (120)
    expect(result).toBeGreaterThan(110);
  });
});

describe("calculatePreciseBPM", () => {
  test("returns null for empty array", () => {
    expect(calculatePreciseBPM([])).toBeNull();
  });

  test("returns null for single timestamp", () => {
    expect(calculatePreciseBPM([1000])).toBeNull();
  });

  test("calculates correct BPM for consistent intervals", () => {
    // 500ms between taps = 120 BPM
    const timestamps = [1000, 1500, 2000, 2500, 3000];
    expect(calculatePreciseBPM(timestamps)).toBe(120);
  });

  test("preserves precision for irregular intervals", () => {
    // Should return precise (unrounded) BPM
    const timestamps = [1000, 1580, 2200, 2790, 3410];
    expect(calculatePreciseBPM(timestamps)).toBeCloseTo(99.59, 2);
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
    expect(calculateBPM(timestamps)).toBe(99.59);

    // 1 decimal place
    const config: TempoConfig = { ...DEFAULT_CONFIG, decimalPlaces: 1 };
    expect(calculateBPM(timestamps, config)).toBe(99.6);

    // 0 decimal places
    const intConfig: TempoConfig = { ...DEFAULT_CONFIG, decimalPlaces: 0 };
    expect(calculateBPM(timestamps, intConfig)).toBe(100);
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

describe("updateTapData", () => {
  const emptyTapData: TapData = {
    timestamps: [],
    bpm: null,
    rawBpm: null,
    variance: null,
    recentIntervals: [],
    tempoChangeDetected: false,
  };

  test("adds a timestamp to empty data", () => {
    const result = updateTapData(emptyTapData, 1000);

    expect(result.timestamps).toEqual([1000]);
    expect(result.bpm).toBeNull();
    expect(result.rawBpm).toBeNull();
    expect(result.variance).toBeNull();
  });

  test("adds a timestamp and calculates BPM", () => {
    const initialData: TapData = {
      ...emptyTapData,
      timestamps: [1000],
    };

    const result = updateTapData(initialData, 1500);

    expect(result.timestamps).toEqual([1000, 1500]);
    expect(result.bpm).toBe(120);
    expect(result.rawBpm).toBe(120);
    // With just 2 timestamps and identical intervals, variance should be null
    expect(result.variance).toBeNull();
  });

  test("resets after long pause when resetAfterPause is true", () => {
    const initialData: TapData = {
      ...emptyTapData,
      timestamps: [1000, 1500, 2000],
      bpm: 120,
      rawBpm: 120,
      variance: 0,
    };

    const config: TempoConfig = { ...DEFAULT_CONFIG, resetAfterPause: true, pauseThreshold: 1000 };
    // Add a timestamp after a 3-second pause
    const result = updateTapData(initialData, 5000, config);

    // Should reset and start a new tempo measurement
    expect(result.timestamps).toEqual([5000]);
    expect(result.bpm).toBeNull();
    expect(result.rawBpm).toBeNull();
  });

  test("detects tempo change when interval pattern changes significantly", () => {
    // Create consistent 120 BPM tapping
    const timestamps = [1000, 1500, 2000, 2500, 3000, 3500];
    const recentIntervals = [500, 500, 500]; // 120 BPM

    const initialData: TapData = {
      timestamps,
      bpm: 120,
      rawBpm: 120,
      variance: 0,
      recentIntervals,
      tempoChangeDetected: false,
    };

    // Now tap at 60 BPM (1000ms interval)
    const result = updateTapData(initialData, 4500);

    // Should detect tempo change
    expect(result.tempoChangeDetected).toBe(true);

    // BPM should still adapt in the direction of new tempo
    expect(result.rawBpm).not.toBe(120);
  });
});
