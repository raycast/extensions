type GlucoseUnit = "mmol" | "mgdl";

/**
 * Returns a color code based on the glucose value and unit
 * @param value - The glucose reading value
 * @param unit - The unit of measurement ('mmol' or 'mgdl')
 * @returns A hex color code representing the glucose range
 */
export function getValueColor(value: number, unit: GlucoseUnit): string {
  // Convert mgdl to mmol for consistent comparison
  const mmolValue = unit === "mgdl" ? value / 18 : value;

  // Low: < 4.0 mmol/L (72 mg/dL)
  if (mmolValue < 4.0) {
    return "#EAB308"; // yellow
  }

  // High: > 10.0 mmol/L (180 mg/dL)
  if (mmolValue > 10.0) {
    return "#EF4444"; // red
  }

  // Normal: between 4.0 and 10.0 mmol/L
  return "#10B981"; // green
}
