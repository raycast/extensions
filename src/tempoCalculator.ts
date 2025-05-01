export interface TapData {
  readonly timestamps: ReadonlyArray<number>;
  readonly bpm: number | null;
  readonly rawBpm: number | null; // Store the raw BPM value before smoothing
}

export interface TempoConfig {
  readonly decimalPlaces: 0 | 1 | 2; // Number of decimal places to round to
  readonly smoothingFactor: number; // 0-1, where 0 = no smoothing, 1 = maximum smoothing
  readonly maxTaps: number; // Maximum number of timestamps to keep
}

export const DEFAULT_CONFIG: TempoConfig = {
  decimalPlaces: 2,
  smoothingFactor: 0.3, // Moderate smoothing
  maxTaps: 10,
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
 * Converts an average interval (in ms) to BPM
 * @param avgInterval Average interval in milliseconds
 * @param decimalPlaces Number of decimal places to round to
 * @returns BPM value rounded to the specified decimal places
 */
export const intervalToBPM = (avgInterval: number, decimalPlaces: 0 | 1 | 2 = 2): number => {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round((60000 / avgInterval) * factor) / factor;
};

/**
 * Applies smoothing to a new BPM value based on previous value
 * @param newBpm New calculated BPM value
 * @param previousBpm Previous BPM value (can be null if no previous value exists)
 * @param smoothingFactor Factor determining how much smoothing to apply (0-1)
 * @param decimalPlaces Number of decimal places to round to
 * @returns Smoothed BPM value
 */
export const smoothBPM = (newBpm: number | null, previousBpm: number | null, config: TempoConfig): number | null => {
  // If no previous BPM or new BPM is null, return the new BPM
  if (previousBpm === null || newBpm === null) {
    return newBpm;
  }

  // Apply exponential smoothing: newValue = α * rawValue + (1 - α) * previousValue
  // where α is (1 - smoothingFactor)
  const alpha = 1 - Math.max(0, Math.min(1, config.smoothingFactor)); // Clamp between 0 and 1
  const smoothed = alpha * newBpm + (1 - alpha) * previousBpm;

  // Apply the same rounding as used for raw BPM
  const factor = Math.pow(10, config.decimalPlaces);
  return Math.round(smoothed * factor) / factor;
};

/**
 * Calculates BPM based on an array of timestamps
 * @param timestamps Array of timestamp values in milliseconds
 * @param config Configuration options for BPM calculation
 * @returns Calculated BPM rounded to the specified decimal places, or null if insufficient data
 */
export const calculateBPM = (
  timestamps: ReadonlyArray<number>,
  config: TempoConfig = DEFAULT_CONFIG,
): number | null => {
  if (timestamps.length < 2) {
    return null;
  }

  return intervalToBPM(calculateAverage(createIntervals(timestamps)), config.decimalPlaces);
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
  const newTimestamps = addTimestamp(currentData.timestamps, timestamp, config.maxTaps);
  const rawBpm = calculateBPM(newTimestamps, config);
  const smoothedBpm = smoothBPM(rawBpm, currentData.bpm, config);

  return {
    timestamps: newTimestamps,
    rawBpm,
    bpm: smoothedBpm,
  };
};
