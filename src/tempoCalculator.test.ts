import { expect, test, describe } from "vitest";
import {
  calculateBPM,
  updateTapData,
  TapData,
  createIntervals,
  calculateAverage,
  intervalToBPM,
  addTimestamp,
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

  test("rounds to 2 decimal places", () => {
    expect(intervalToBPM(603)).toBe(99.5);
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

  test("calculates and rounds BPM correctly for irregular intervals", () => {
    // Slightly irregular intervals averaging around 600ms = ~100 BPM
    const timestamps = [1000, 1580, 2200, 2790, 3410];
    const result = calculateBPM(timestamps);

    // With rounding to 2 decimal places
    expect(result).toBeCloseTo(99.59, 2);
  });
});

describe("updateTapData", () => {
  test("adds a timestamp to empty data", () => {
    const initialData: TapData = { timestamps: [], bpm: null };
    const result = updateTapData(initialData, 1000);

    expect(result.timestamps).toEqual([1000]);
    expect(result.bpm).toBeNull();
  });

  test("adds a timestamp and calculates BPM", () => {
    const initialData: TapData = { timestamps: [1000], bpm: null };
    const result = updateTapData(initialData, 1500);

    expect(result.timestamps).toEqual([1000, 1500]);
    expect(result.bpm).toBe(120);
  });

  test("respects the maxTaps limit", () => {
    const initialData: TapData = {
      timestamps: [1000, 1500, 2000, 2500, 3000],
      bpm: 120,
    };

    const result = updateTapData(initialData, 3500, 3);

    // Should only keep the last 3 timestamps (including the new one)
    expect(result.timestamps).toEqual([2500, 3000, 3500]);
    expect(result.bpm).toBe(120);
  });

  test("recalculates BPM after adding timestamp", () => {
    const initialData: TapData = {
      timestamps: [1000, 1500],
      bpm: 120,
    };

    // Adding a timestamp with a longer interval should decrease the BPM
    const result = updateTapData(initialData, 2200);

    expect(result.timestamps).toEqual([1000, 1500, 2200]);
    expect(result.bpm).toBeCloseTo(100, 2);
  });
});
