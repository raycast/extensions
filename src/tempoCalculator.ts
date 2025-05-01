export interface TapData {
  readonly timestamps: ReadonlyArray<number>;
  readonly bpm: number | null;
}

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
 * @returns BPM value rounded to 2 decimal places
 */
export const intervalToBPM = (avgInterval: number): number => Math.round((60000 / avgInterval) * 100) / 100;

/**
 * Calculates BPM based on an array of timestamps
 * @param timestamps Array of timestamp values in milliseconds
 * @returns Calculated BPM rounded to 2 decimal places, or null if insufficient data
 */
export const calculateBPM = (timestamps: ReadonlyArray<number>): number | null => {
  if (timestamps.length < 2) {
    return null;
  }

  const intervals = createIntervals(timestamps);
  const avgInterval = calculateAverage(intervals);
  const bpm = intervalToBPM(avgInterval);

  return bpm;
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
 * @param maxTaps Maximum number of timestamps to keep (for sliding window)
 * @returns Updated tap data with new BPM calculation
 */
export const updateTapData = (currentData: TapData, timestamp: number, maxTaps = 10): TapData => {
  const newTimestamps = addTimestamp(currentData.timestamps, timestamp, maxTaps);
  const bpm = calculateBPM(newTimestamps);

  return {
    timestamps: newTimestamps,
    bpm,
  };
};
