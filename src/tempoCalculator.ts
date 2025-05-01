export interface TapData {
  readonly timestamps: ReadonlyArray<number>;
  readonly bpm: number | null;
  readonly rawBpm: number | null; // Store the raw BPM value before smoothing
  readonly variance: number | null; // Store the variance of intervals
  readonly recentIntervals: ReadonlyArray<number>; // Store recent intervals for tempo change detection
  readonly tempoChangeDetected: boolean; // Flag when a tempo change is detected
}

export interface TempoConfig {
  readonly decimalPlaces: 0 | 1 | 2; // Number of decimal places to round to
  readonly smoothingFactor: number; // 0-1, where 0 = no smoothing, 1 = maximum smoothing
  readonly maxTaps: number; // Maximum number of timestamps to keep
  readonly varianceThreshold: number; // Threshold for considering tapping consistent
  readonly minTapsForConfidence: number; // Minimum taps needed before we start reducing smoothing
  readonly tempoChangeThreshold: number; // Ratio threshold for detecting tempo change (e.g., 1.8 means 80% change)
  readonly pauseThreshold: number; // Milliseconds threshold for considering a pause in tapping
  readonly resetAfterPause: boolean; // Whether to reset calculations after a long pause
}

export const DEFAULT_CONFIG: TempoConfig = {
  decimalPlaces: 2,
  smoothingFactor: 0.3, // Moderate smoothing
  maxTaps: 10,
  varianceThreshold: 5000, // Milliseconds squared - adjust based on testing
  minTapsForConfidence: 4, // Need at least 4 taps to start reducing smoothing
  tempoChangeThreshold: 1.8, // Detect tempo changes where intervals change by 80% or more
  pauseThreshold: 2000, // 2 seconds pause indicates potential tempo change
  resetAfterPause: true, // Reset after long pauses
};

/**
 * Creates intervals between consecutive timestamps
 * @param timestamps Array of timestamp values in milliseconds
 * @returns Array of intervals between consecutive timestamps
 */
export const createIntervals = (timestamps: ReadonlyArray<number>): ReadonlyArray<number> =>
  timestamps.slice(1).map((time, index) => time - timestamps[index]);

/**
 * Calculates the average of an array of numbers
 * @param values Array of numbers
 * @returns Average value
 */
export const calculateAverage = (values: ReadonlyArray<number>): number =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

/**
 * Calculates the variance of an array of numbers
 * @param values Array of numbers
 * @returns Variance value
 */
export const calculateVariance = (values: ReadonlyArray<number>): number => {
  if (values.length <= 1) {
    return 0;
  }

  const avg = calculateAverage(values);
  const squaredDiffs = values.map((value) => Math.pow(value - avg, 2));
  return calculateAverage(squaredDiffs);
};

/**
 * Calculates the median of an array of numbers
 * @param values Array of numbers
 * @returns Median value
 */
export const calculateMedian = (values: ReadonlyArray<number>): number | null => {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

/**
 * Detects if there has been a tempo change based on recent intervals
 * @param intervals Array of all intervals
 * @param recentIntervals Array of most recent intervals
 * @param latestInterval The most recent interval
 * @param config Configuration options
 * @returns Whether a tempo change has been detected
 */
export const detectTempoChange = (
  intervals: ReadonlyArray<number>,
  recentIntervals: ReadonlyArray<number>,
  latestInterval: number,
  config: TempoConfig,
): boolean => {
  // Need at least minTapsForConfidence intervals to detect a tempo change
  if (intervals.length < config.minTapsForConfidence || recentIntervals.length < 2) {
    return false;
  }

  // Check for pause - if interval is very long compared to average
  const prevMedian = calculateMedian(intervals.slice(0, -1));
  if (prevMedian === null) return false;

  // Long pause detection - a pause followed by new tapping may indicate tempo change
  if (latestInterval > config.pauseThreshold) {
    return true;
  }

  // Calculate median of recent intervals excluding the latest one
  const recentMedian = calculateMedian(recentIntervals.slice(0, -1));
  if (recentMedian === null) return false;

  // Check if the ratio between the latest interval and recent median
  // is significantly different (indicating tempo change)
  const ratio = Math.max(latestInterval / recentMedian, recentMedian / latestInterval);

  // If ratio is close to 2:1 or 1:2, it may indicate doubling/halving of tempo
  // Common patterns: half-time (2x interval) or double-time (0.5x interval)
  const isNearRationalRatio =
    (ratio >= 1.9 && ratio <= 2.1) || // 2:1 ratio (half-time)
    (ratio >= 0.45 && ratio <= 0.55); // 1:2 ratio (double-time)

  // Check if latest interval deviates significantly from established pattern
  const isSignificantChange = ratio > config.tempoChangeThreshold;

  return isNearRationalRatio || isSignificantChange;
};

/**
 * Converts an average interval (in ms) to BPM
 * @param avgInterval Average interval in milliseconds
 * @returns Precise BPM value (not rounded)
 */
export const intervalToBPM = (avgInterval: number): number => 60000 / avgInterval;

/**
 * Rounds a number to the specified number of decimal places
 * @param value The number to round
 * @param decimalPlaces Number of decimal places to round to
 * @returns Rounded number
 */
export const roundToDecimalPlaces = (value: number, decimalPlaces: 0 | 1 | 2): number => {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(value * factor) / factor;
};

/**
 * Calculates dynamic smoothing factor based on tap count and interval variance
 * @param baseSmoothing Base smoothing factor from config
 * @param tapCount Number of taps collected
 * @param variance Variance of intervals
 * @param tempoChangeDetected Whether a tempo change was detected
 * @param config Configuration options
 * @returns Adjusted smoothing factor
 */
export const calculateDynamicSmoothing = (
  baseSmoothing: number,
  tapCount: number,
  variance: number | null,
  tempoChangeDetected: boolean,
  config: TempoConfig,
): number => {
  // If tempo change detected, use minimal smoothing to adapt quickly
  if (tempoChangeDetected) {
    return 0.1; // Very low smoothing to adapt quickly to new tempo
  }

  // Start with the base smoothing factor
  let dynamicFactor = baseSmoothing;

  // Reduce smoothing as more taps are collected
  if (tapCount >= config.minTapsForConfidence) {
    // Exponential decay based on tap count, max factor reduction of 60%
    const tapCountFactor = Math.min(0.6, 0.1 * Math.log(tapCount));
    dynamicFactor *= 1 - tapCountFactor;
  }

  // If we have variance data, reduce smoothing further when tapping is consistent
  if (variance !== null && variance > 0) {
    // More consistent tapping (lower variance) means less smoothing needed
    const varianceFactor = Math.min(1, variance / config.varianceThreshold);
    dynamicFactor *= varianceFactor;
  }

  // Ensure the smoothing factor is between 0 and the original base value
  return Math.max(0, Math.min(baseSmoothing, dynamicFactor));
};

/**
 * Applies adaptive smoothing to a new BPM value based on previous value
 * @param newBpm New calculated BPM value
 * @param previousBpm Previous BPM value (can be null if no previous value exists)
 * @param tapCount Number of taps collected
 * @param variance Variance of intervals
 * @param tempoChangeDetected Whether a tempo change was detected
 * @param config Configuration options
 * @returns Smoothed BPM value (not rounded)
 */
export const smoothBPM = (
  newBpm: number | null,
  previousBpm: number | null,
  tapCount: number,
  variance: number | null,
  tempoChangeDetected: boolean,
  config: TempoConfig,
): number | null => {
  // If no previous BPM or new BPM is null, return the new BPM
  if (previousBpm === null || newBpm === null) {
    return newBpm;
  }

  // If tempo change detected, reset to new tempo with minimal smoothing
  if (tempoChangeDetected) {
    return 0.8 * newBpm + 0.2 * previousBpm; // 80% new, 20% old
  }

  // Calculate the dynamic smoothing factor
  const dynamicSmoothing = calculateDynamicSmoothing(
    config.smoothingFactor,
    tapCount,
    variance,
    tempoChangeDetected,
    config,
  );

  // Apply exponential smoothing: newValue = α * rawValue + (1 - α) * previousValue
  // where α is (1 - smoothingFactor)
  const alpha = 1 - dynamicSmoothing;
  return alpha * newBpm + (1 - alpha) * previousBpm;
};

/**
 * Calculates precise BPM based on an array of timestamps (no rounding)
 * @param timestamps Array of timestamp values in milliseconds
 * @returns Calculated BPM value or null if insufficient data
 */
export const calculatePreciseBPM = (timestamps: ReadonlyArray<number>): number | null => {
  if (timestamps.length < 2) {
    return null;
  }

  return intervalToBPM(calculateAverage(createIntervals(timestamps)));
};

/**
 * Calculates BPM with proper rounding according to config
 * @param timestamps Array of timestamp values in milliseconds
 * @param config Configuration options
 * @returns Calculated BPM rounded to the specified decimal places, or null if insufficient data
 */
export const calculateBPM = (
  timestamps: ReadonlyArray<number>,
  config: TempoConfig = DEFAULT_CONFIG,
): number | null => {
  const preciseBpm = calculatePreciseBPM(timestamps);

  if (preciseBpm === null) {
    return null;
  }

  return roundToDecimalPlaces(preciseBpm, config.decimalPlaces);
};

/**
 * Creates a new timestamps array with an additional timestamp, respecting the max limit
 * @param timestamps Current timestamps array
 * @param newTimestamp New timestamp to add
 * @param maxTaps Maximum number of timestamps to keep
 * @returns New array with the added timestamp
 */
export const addTimestamp = (
  timestamps: ReadonlyArray<number>,
  newTimestamp: number,
  maxTaps: number,
): ReadonlyArray<number> => [...timestamps, newTimestamp].slice(-maxTaps);

/**
 * Determines if a new tap is after a significant pause
 * @param timestamps Current timestamps array
 * @param newTimestamp New timestamp to add
 * @param pauseThreshold Milliseconds threshold for a pause
 * @returns Whether this tap follows a significant pause
 */
export const isAfterPause = (
  timestamps: ReadonlyArray<number>,
  newTimestamp: number,
  pauseThreshold: number,
): boolean => {
  if (timestamps.length === 0) return false;

  const lastTimestamp = timestamps[timestamps.length - 1];
  const timeSinceLastTap = newTimestamp - lastTimestamp;

  return timeSinceLastTap > pauseThreshold;
};

/**
 * Updates tap data with a new timestamp
 * @param currentData Current tap data
 * @param timestamp New timestamp to add
 * @param config Configuration options for tempo calculation
 * @returns Updated tap data with new BPM calculation
 */
export const updateTapData = (
  currentData: TapData,
  timestamp: number,
  config: TempoConfig = DEFAULT_CONFIG,
): TapData => {
  // Check if we should reset after a long pause
  const afterPause = isAfterPause(currentData.timestamps, timestamp, config.pauseThreshold);

  // If resetting after pause, start fresh
  if (config.resetAfterPause && afterPause && currentData.timestamps.length > 0) {
    return {
      timestamps: [timestamp],
      bpm: null,
      rawBpm: null,
      variance: null,
      recentIntervals: [],
      tempoChangeDetected: false,
    };
  }

  const newTimestamps = addTimestamp(currentData.timestamps, timestamp, config.maxTaps);

  // Calculate intervals and variance
  const intervals = createIntervals(newTimestamps);
  const variance = intervals.length > 1 ? calculateVariance(intervals) : null;

  // For tempo change detection, maintain a sliding window of recent intervals
  const recentIntervalsWindow = 4; // Use last 4 intervals to detect changes
  let newRecentIntervals: ReadonlyArray<number> = [];

  // If we have a new interval, add it to recent intervals
  if (intervals.length > 0) {
    const latestInterval = intervals[intervals.length - 1];
    newRecentIntervals = addTimestamp(currentData.recentIntervals || [], latestInterval, recentIntervalsWindow);
  }

  // Detect tempo change if we have enough intervals
  let tempoChangeDetected = false;
  if (intervals.length > 0 && newRecentIntervals.length > 1) {
    const latestInterval = intervals[intervals.length - 1];
    tempoChangeDetected = detectTempoChange(intervals, newRecentIntervals, latestInterval, config);
  }

  // If tempo change detected, consider using only recent timestamps for BPM
  const bpmTimestamps =
    tempoChangeDetected && newTimestamps.length > 3
      ? newTimestamps.slice(-3) // Use only the last 3 timestamps after tempo change
      : newTimestamps;

  // Calculate precise values without rounding
  const preciseBpm = calculatePreciseBPM(bpmTimestamps);

  // Apply adaptive smoothing based on tap count and variance
  const smoothedPreciseBpm = smoothBPM(
    preciseBpm,
    currentData.bpm,
    newTimestamps.length,
    variance,
    tempoChangeDetected,
    config,
  );

  // Apply rounding only for the returned values
  const rawBpm = preciseBpm !== null ? roundToDecimalPlaces(preciseBpm, config.decimalPlaces) : null;
  const bpm = smoothedPreciseBpm !== null ? roundToDecimalPlaces(smoothedPreciseBpm, config.decimalPlaces) : null;

  return {
    timestamps: newTimestamps,
    rawBpm,
    bpm,
    variance,
    recentIntervals: newRecentIntervals,
    tempoChangeDetected,
  };
};
