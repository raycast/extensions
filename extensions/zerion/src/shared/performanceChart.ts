import { minus } from "./typography";
import { DEFAULT_PERIOD, PERIODS, type Period } from "./periods";

export type Theme = "light" | "dark";

// Mirrors the Zerion web app palette (design/colors.css and ui-kit/Chart/helpers.ts)
const PALETTE = {
  light: {
    text: "#16161a",
    muted: "#9c9fa8",
    pillText: "#71727d",
    pillSelected: "#f0f0f2",
    guide: "#e1e1e1",
    empty: "#f5f5f7",
    changePositive: "#01a643",
    changeNegative: "#ff4a4a",
    linePositive: "#1fc260",
    lineNegative: "#ff4a4a",
  },
  dark: {
    text: "#ffffff",
    muted: "#70737b",
    pillText: "#9da0a6",
    pillSelected: "#29292c",
    guide: "#4b4b4d",
    empty: "#1d1d21",
    changePositive: "#4fbf67",
    changeNegative: "#ff5c5c",
    linePositive: "#31b566",
    lineNegative: "#ff5c5c",
  },
};

const FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif`;

export interface Change {
  absolute: number;
  /** Percent, e.g. 1.23 for +1.23% */
  relative: number | null;
}

// Values are a currency amount: web app drops cents above $1M
export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    ...(Math.abs(value) >= 1_000_000 ? { maximumFractionDigits: 0 } : {}),
  }).format(value);
}

/** Token prices: cents for normal prices, more precision for sub-dollar ones */
export function formatPrice(value: number) {
  const abs = Math.abs(value);
  if (abs === 0 || abs >= 1) {
    return formatUsd(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumSignificantDigits: 4,
  }).format(value);
}

function formatPercent(value: number) {
  const abs = Math.abs(value);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: abs < 1 ? 2 : 1 }).format(abs);
}

export function formatChange(change: Change) {
  const sign = change.absolute >= 0 ? "+" : minus;
  const amount = formatUsd(Math.abs(change.absolute));
  return change.relative === null ? `${sign}${amount}` : `${sign}${formatPercent(change.relative)}% (${amount})`;
}

/** Change between the first and last point of a chart */
export function getChartChange(points: [number, number][]): Change | null {
  if (points.length < 2) {
    return null;
  }
  const first = points[0][1];
  const last = points[points.length - 1][1];
  return { absolute: last - first, relative: first ? ((last - first) / first) * 100 : null };
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Smooth path through the points that never overshoots the data
 * (monotone cubic interpolation, same as Chart.js `cubicInterpolationMode: 'monotone'`)
 */
function monotonePath(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n < 2) {
    return "";
  }
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    slopes.push((points[i + 1].y - points[i].y) / (points[i + 1].x - points[i].x));
  }
  const tangents: number[] = [slopes[0]];
  for (let i = 1; i < n - 1; i++) {
    const h0 = points[i].x - points[i - 1].x;
    const h1 = points[i + 1].x - points[i].x;
    tangents.push(
      slopes[i - 1] * slopes[i] <= 0
        ? 0
        : (3 * (h0 + h1)) / ((2 * h1 + h0) / slopes[i - 1] + (h1 + 2 * h0) / slopes[i]),
    );
  }
  tangents.push(slopes[n - 2]);

  let path = `M${round(points[0].x)},${round(points[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = (points[i + 1].x - points[i].x) / 3;
    path +=
      `C${round(points[i].x + h)},${round(points[i].y + tangents[i] * h)} ` +
      `${round(points[i + 1].x - h)},${round(points[i + 1].y - tangents[i + 1] * h)} ` +
      `${round(points[i + 1].x)},${round(points[i + 1].y)}`;
  }
  return path;
}

/** Drops points sharing a timestamp so the curve maths never divides by zero */
function uniqueByTime(points: [number, number][]) {
  return points.filter((point, index) => index === 0 || point[0] > points[index - 1][0]);
}

/**
 * Small value dispersion is flattened so it doesn't read as a big move
 * (same rule as the web app's getYLimits)
 */
function getYLimits(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const diff = max - min || Math.abs(max) || 1;
  const offset = min && max / min < 1.005 ? diff * 5 : diff * 0.05;
  return { min: min - offset, max: max + offset };
}

function formatChartDate(timestamp: number, period: Period) {
  const date = new Date(timestamp);
  if (period.id === "1h" || period.id === "1d") {
    return date.toLocaleString("en-US", {
      ...(period.id === "1d" ? { month: "short", day: "numeric" } : {}),
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(period.id === "1y" || period.id === "max" ? { year: "numeric" } : {}),
  });
}

function toDataUri(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/**
 * The chart itself: dotted high/low guides with values on the right, the
 * line, a dot on the last point and, when a `period` is given, the window's
 * start/end dates below. Renders an empty placeholder when there is nothing
 * to draw.
 */
function drawLineChart({
  colors,
  points,
  plot,
  width,
  height,
  period,
}: {
  colors: (typeof PALETTE)[Theme];
  points: [number, number][] | undefined;
  plot: { left: number; right: number; top: number; bottom: number };
  width: number;
  height: number;
  /** Omit to draw the chart without date labels */
  period?: Period;
}) {
  const chartPoints = points ? uniqueByTime(points) : [];
  if (chartPoints.length < 2) {
    return (
      `<rect x="0" y="${plot.top}" width="${width}" height="${plot.bottom - plot.top}" rx="12" fill="${colors.empty}"/>` +
      `<text x="${width / 2}" y="${(plot.top + plot.bottom) / 2 + 5}" font-size="14" font-weight="500" ` +
      `text-anchor="middle" fill="${colors.muted}">No chart data</text>`
    );
  }
  const parts: string[] = [];
  const values = chartPoints.map(([, value]) => value);
  const yLimits = getYLimits(values);
  const firstTime = chartPoints[0][0];
  const lastTime = chartPoints[chartPoints.length - 1][0];
  const toX = (time: number) => plot.left + ((time - firstTime) / (lastTime - firstTime)) * (plot.right - plot.left);
  const toY = (value: number) =>
    plot.bottom - ((value - yLimits.min) / (yLimits.max - yLimits.min)) * (plot.bottom - plot.top);
  const screenPoints = chartPoints.map(([time, value]) => ({ x: toX(time), y: toY(value) }));
  const isPositive = values[values.length - 1] >= values[0];
  const lineColor = isPositive ? colors.linePositive : colors.lineNegative;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const guides = max === min ? [max] : [max, min];
  guides.forEach((value) => {
    const y = round(toY(value));
    parts.push(
      `<line x1="${plot.left}" y1="${y}" x2="${plot.right}" y2="${y}" stroke="${colors.guide}" stroke-width="1" ` +
        `stroke-dasharray="1 4" stroke-linecap="round"/>` +
        `<text x="${width}" y="${y + 4}" font-size="12" text-anchor="end" fill="${colors.muted}">${escapeXml(formatPrice(value))}</text>`,
    );
  });

  parts.push(
    `<path d="${monotonePath(screenPoints)}" fill="none" stroke="${lineColor}" stroke-width="2" ` +
      `stroke-linejoin="round" stroke-linecap="round"/>`,
  );

  const last = screenPoints[screenPoints.length - 1];
  parts.push(
    `<circle cx="${round(last.x)}" cy="${round(last.y)}" r="9" fill="${lineColor}" fill-opacity="0.2"/>` +
      `<circle cx="${round(last.x)}" cy="${round(last.y)}" r="4.5" fill="${lineColor}"/>`,
  );

  if (period) {
    parts.push(
      `<text x="${plot.left}" y="${height - 8}" font-size="12" fill="${colors.muted}">${escapeXml(formatChartDate(firstTime, period))}</text>` +
        `<text x="${plot.right}" y="${height - 8}" font-size="12" text-anchor="end" fill="${colors.muted}">${escapeXml(formatChartDate(lastTime, period))}</text>`,
    );
  }
  return parts.join("");
}

const WIDTH = 720;
const PLOT = { left: 2, right: 620, top: 124, bottom: 282 };
const HEIGHT = 312;

/** The Performance screen as one SVG: total value, change, Period pills and the chart */
export function renderPerformanceCard({
  theme,
  totalValue,
  change,
  period,
  points,
}: {
  theme: Theme;
  totalValue: number | undefined;
  change: Change | null;
  period: Period;
  points: [number, number][] | undefined;
}) {
  const colors = PALETTE[theme];
  const parts: string[] = [];

  // Total value, with the cents dimmed like the web app
  if (totalValue !== undefined) {
    const formatted = formatUsd(totalValue);
    const dot = formatted.lastIndexOf(".");
    const whole = dot === -1 ? formatted : formatted.slice(0, dot);
    const fraction = dot === -1 ? "" : formatted.slice(dot);
    parts.push(
      `<text x="0" y="30" font-size="32" font-weight="700" fill="${colors.text}" letter-spacing="-0.5">` +
        `${escapeXml(whole)}<tspan fill="${colors.muted}">${escapeXml(fraction)}</tspan></text>`,
    );
  }

  if (change) {
    const changeColor = change.absolute >= 0 ? colors.changePositive : colors.changeNegative;
    parts.push(
      `<text x="0" y="56" font-size="15" font-weight="600">` +
        `<tspan fill="${changeColor}">${escapeXml(formatChange(change))}</tspan>` +
        `<tspan fill="${colors.muted}" font-weight="500"> · ${escapeXml(period.caption)}</tspan></text>`,
    );
  }

  // Period pills, the selected one highlighted
  PERIODS.forEach((item, index) => {
    const x = index * 56;
    const selected = item.id === period.id;
    parts.push(
      (selected ? `<rect x="${x}" y="72" width="48" height="28" rx="8" fill="${colors.pillSelected}"/>` : "") +
        `<text x="${x + 24}" y="91" font-size="13" font-weight="600" text-anchor="middle" ` +
        `fill="${selected ? colors.text : colors.pillText}">${item.label}</text>`,
    );
  });

  parts.push(drawLineChart({ colors, points, plot: PLOT, width: WIDTH, height: HEIGHT, period }));

  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" ` +
      `font-family="${FONT}">${parts.join("")}</svg>`,
  );
}

/** Tiny line for list icons; null when there's nothing to draw */
export function renderSparkline({ theme, points }: { theme: Theme; points: [number, number][] }) {
  const chartPoints = uniqueByTime(points);
  if (chartPoints.length < 2) {
    return null;
  }
  const size = 64;
  const padding = 6;
  const values = chartPoints.map(([, value]) => value);
  const yLimits = getYLimits(values);
  const firstTime = chartPoints[0][0];
  const lastTime = chartPoints[chartPoints.length - 1][0];
  const screenPoints = chartPoints.map(([time, value]) => ({
    x: padding + ((time - firstTime) / (lastTime - firstTime)) * (size - padding * 2),
    y: size - padding - ((value - yLimits.min) / (yLimits.max - yLimits.min)) * (size - padding * 2),
  }));
  const colors = PALETTE[theme];
  const lineColor = values[values.length - 1] >= values[0] ? colors.linePositive : colors.lineNegative;
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      `<path d="${monotonePath(screenPoints)}" fill="none" stroke="${lineColor}" stroke-width="5" ` +
      `stroke-linejoin="round" stroke-linecap="round"/></svg>`,
  );
}

const TOKEN_WIDTH = 480;
const TOKEN_PLOT = { left: 2, right: 400, top: 72, bottom: 200 };
// No date labels under the token chart: the panel clips the bottom edge and
// the 1D window is already stated in the change caption.
const TOKEN_HEIGHT = 210;

/** The top of Token Details as one SVG: price, 24h change and the 1D price chart */
export function renderTokenCard({
  theme,
  price,
  change,
  points,
}: {
  theme: Theme;
  price: number | null | undefined;
  change: Change | null;
  points: [number, number][] | undefined;
}) {
  const colors = PALETTE[theme];
  const parts: string[] = [];

  if (price != null) {
    parts.push(
      `<text x="0" y="30" font-size="32" font-weight="700" fill="${colors.text}" letter-spacing="-0.5">` +
        `${escapeXml(formatPrice(price))}</text>`,
    );
  }

  if (change) {
    const changeColor = change.absolute >= 0 ? colors.changePositive : colors.changeNegative;
    parts.push(
      `<text x="0" y="54" font-size="15" font-weight="600">` +
        `<tspan fill="${changeColor}">${escapeXml(formatChange(change))}</tspan>` +
        `<tspan fill="${colors.muted}" font-weight="500"> · ${escapeXml(DEFAULT_PERIOD.caption)}</tspan></text>`,
    );
  }

  parts.push(
    drawLineChart({
      colors,
      points,
      plot: TOKEN_PLOT,
      width: TOKEN_WIDTH,
      height: TOKEN_HEIGHT,
    }),
  );

  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TOKEN_WIDTH}" height="${TOKEN_HEIGHT}" viewBox="0 0 ${TOKEN_WIDTH} ${TOKEN_HEIGHT}" ` +
      `font-family="${FONT}">${parts.join("")}</svg>`,
  );
}
