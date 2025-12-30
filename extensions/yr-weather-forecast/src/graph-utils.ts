/**
 * Find minimum finite value in array
 */
export function minFinite(values: number[]): number | undefined {
  let min: number | undefined = undefined;
  for (const v of values) {
    if (Number.isFinite(v)) min = min === undefined ? (v as number) : Math.min(min, v as number);
  }
  return min;
}

/**
 * Find maximum finite value in array
 */
export function maxFinite(values: number[]): number | undefined {
  let max: number | undefined = undefined;
  for (const v of values) {
    if (Number.isFinite(v)) max = max === undefined ? (v as number) : Math.max(max, v as number);
  }
  return max;
}

/**
 * Convert SVG to data URI for markdown embedding
 */
export function svgToDataUri(svg: string): string {
  // Encode minimally to keep it readable while safe for data URI
  return encodeURIComponent(svg).replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29");
}
