import { scaleLinear } from "d3-scale";
import { line, curveMonotoneX } from "d3-shape";
import { TimeseriesEntry } from "./weather-client";
import { SunTimes } from "./sunrise-client";
import { getGraphThresholds, getWeatherConfig } from "./config/weather-config";
import { getUnits } from "./units";
import { precipitationAmount, symbolCode } from "./utils-forecast";
import { symbolToEmoji } from "./utils/weather-symbols";
import { directionFromDegrees } from "./weather-utils";
import { formatDate, formatTime } from "./utils/date-utils";
import { convertTemperature, convertPrecipitation } from "./config/weather-config";
// Utility functions for graph generation
function minFinite(arr: (number | undefined)[]): number | undefined {
  const finite = arr.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return finite.length > 0 ? Math.min(...finite) : undefined;
}

function maxFinite(arr: (number | undefined)[]): number | undefined {
  const finite = arr.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return finite.length > 0 ? Math.max(...finite) : undefined;
}

function svgToDataUri(svg: string): string {
  return encodeURIComponent(svg);
}

export function buildGraphMarkdown(
  name: string,
  series: TimeseriesEntry[],
  hours: number,
  opts?: { sunByDate?: Record<string, SunTimes>; title?: string; smooth?: boolean },
): { markdown: string } {
  const subset = series.slice(0, hours);
  const graphConfig = getGraphThresholds();
  const weatherConfig = getWeatherConfig();
  const { WIDTH: width, HEIGHT: height, MARGIN: margin } = graphConfig;
  const innerWidth = width - margin.LEFT - margin.RIGHT;
  const innerHeight = height - margin.TOP - margin.BOTTOM;

  const units = getUnits();
  const times = subset.map((s) => new Date(s.time).getTime());
  const tempsC = subset.map((s) => s.data?.instant?.details?.air_temperature ?? NaN);
  const tempsDisplay = tempsC.map((c) =>
    units === "imperial" && Number.isFinite(c) ? convertTemperature(c as number, true) : c,
  );
  const precsMm = subset.map((s) => precipitationAmount(s) ?? 0);
  const precsDisplay = precsMm.map((mm) => convertPrecipitation(mm, units === "imperial"));
  const dirs = subset.map((s) => s.data?.instant?.details?.wind_from_direction);
  const symbols = subset.map((s) => symbolCode(s) ?? "");

  const xMin = times[0] ?? 0;
  const xMax = times[times.length - 1] ?? 1;
  const xScale = scaleLinear()
    .domain([xMin, xMax])
    .range([margin.LEFT, margin.LEFT + innerWidth]);

  const tMinDisp = minFinite(tempsDisplay) ?? 0;
  const tMaxDisp = maxFinite(tempsDisplay) ?? 1;
  const tPad = graphConfig.TEMPERATURE_PADDING;
  const yT = scaleLinear()
    .domain([tMinDisp - tPad, tMaxDisp + tPad])
    .range([margin.TOP + innerHeight, margin.TOP]);
  const ty = (v: number) => yT(v);

  const pMaxDisp = Math.max(
    weatherConfig.precipitation.DISPLAY_MIN,
    maxFinite(precsDisplay) ?? weatherConfig.precipitation.DISPLAY_MIN,
  );
  const yP = scaleLinear()
    .domain([weatherConfig.precipitation.ZERO, pMaxDisp])
    .range([margin.TOP + innerHeight, margin.TOP]);
  const py = (v: number) => yP(v);

  // Build temperature path
  const tempLine = line<number>()
    .x((_: number, i: number) => xScale(times[i]))
    .y((_: number, i: number) => yT(tempsDisplay[i] ?? 0));
  // Always apply smooth curves for better visual appearance
  tempLine.curve(curveMonotoneX);
  const tempPath = tempLine(tempsDisplay as number[]) || "";

  // Build precipitation path (dotted)
  const precLine = line<number>()
    .x((_: number, i: number) => xScale(times[i]))
    .y((_: number, i: number) => yP(precsDisplay[i] ?? 0));
  // Always apply smooth curves for better visual appearance
  precLine.curve(curveMonotoneX);
  const precPath = precLine(precsDisplay as number[]) || "";

  // Build precipitation area fill for better visibility
  const precAreaLine = line<number>()
    .x((_: number, i: number) => xScale(times[i]))
    .y((_: number, i: number) => yP(precsDisplay[i] ?? 0));
  // Always apply smooth curves for better visual appearance
  precAreaLine.curve(curveMonotoneX);
  const precAreaPath = precAreaLine([...precsDisplay, 0, 0] as number[]) || "";
  const precipAreaFill = `<path d="${precAreaPath} L ${xScale(times[times.length - 1])} ${py(weatherConfig.precipitation.ZERO)} L ${xScale(times[0])} ${py(weatherConfig.precipitation.ZERO)} Z" fill="${graphConfig.COLORS.PRECIPITATION_AREA}" opacity="${graphConfig.OPACITY.PRECIPITATION_AREA}" stroke-linejoin="round" />`;

  // Emoji labels for weather above temperature points
  const emojiLabels = times
    .map((t, i) => {
      const x = xScale(t);
      const y = ty(tempsDisplay[i] ?? 0) + graphConfig.POSITIONING.EMOJI_OFFSET;
      const e = symbolToEmoji(symbols[i]);
      return e
        ? `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${graphConfig.FONT_SIZES.EMOJI}" text-anchor="middle">${e}</text>`
        : "";
    })
    .join("");

  // Date boundary lines (midnights) and labels at the top
  const dayLinesAndLabels = (() => {
    if (times.length === 0) return "";
    const start = new Date(times[0]);
    const end = new Date(times[times.length - 1]);
    // Align to local midnight after start
    const firstMidnight = new Date(start);
    firstMidnight.setHours(graphConfig.STYLING.MIDNIGHT_HOUR, 0, 0, 0);
    const parts: string[] = [];
    for (
      let d = firstMidnight;
      d.getTime() < end.getTime();
      d = new Date(d.getTime() + graphConfig.STYLING.MILLISECONDS_PER_DAY)
    ) {
      const x = xScale(d.getTime());
      const label = formatDate(d, "SHORT_DAY");
      parts.push(
        `<g>
          <line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${margin.TOP}" y2="${height - margin.BOTTOM}" stroke="${graphConfig.COLORS.DAY_BOUNDARY}" stroke-dasharray="${graphConfig.STYLING.DAY_BOUNDARY_DASH}" />
          <text x="${x.toFixed(1)}" y="${margin.TOP + graphConfig.POSITIONING.DAY_LABEL_OFFSET}" font-size="${graphConfig.FONT_SIZES.LABEL}" text-anchor="middle" fill="${graphConfig.COLORS.LABEL}">${label}</text>
        </g>`,
      );
    }
    return parts.join("\n");
  })();

  // Sunrise/Sunset lines per day from opts.sunByDate
  const sunLines = (() => {
    const map = opts?.sunByDate ?? {};
    const parts: string[] = [];

    for (const [, st] of Object.entries(map)) {
      const sr = st.sunrise ? new Date(st.sunrise).getTime() : undefined;
      const ss = st.sunset ? new Date(st.sunset).getTime() : undefined;

      if (sr && sr >= xMin && sr <= xMax) {
        const x = xScale(sr);
        parts.push(
          `<g>
            <line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${margin.TOP}" y2="${height - margin.BOTTOM}" stroke="${graphConfig.COLORS.SUNRISE}" stroke-dasharray="${graphConfig.STYLING.SUN_EVENT_DASH}" stroke-width="2" />
            <text x="${x.toFixed(1)}" y="${margin.TOP + graphConfig.POSITIONING.SUN_LABEL_OFFSET}" font-size="16" text-anchor="middle" fill="${graphConfig.COLORS.SUNRISE}" font-weight="bold">🌅</text>
          </g>`,
        );
      }
      if (ss && ss >= xMin && ss <= xMax) {
        const x = xScale(ss);
        parts.push(
          `<g>
            <line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${margin.TOP}" y2="${height - margin.BOTTOM}" stroke="${graphConfig.COLORS.SUNSET}" stroke-dasharray="${graphConfig.STYLING.SUN_EVENT_DASH}" stroke-width="2" />
            <text x="${x.toFixed(1)}" y="${margin.TOP + graphConfig.POSITIONING.SUN_LABEL_OFFSET}" font-size="16" text-anchor="middle" fill="${graphConfig.COLORS.SUNSET}" font-weight="bold">🌇</text>
          </g>`,
        );
      }
    }
    return parts.join("\n");
  })();

  // Wind direction arrows at the bottom
  const windLabels = times
    .map((t, i) => {
      const d = dirs[i];
      if (typeof d !== "number") return "";
      const x = xScale(t);
      const y = height - margin.BOTTOM + graphConfig.POSITIONING.WIND_LABEL_OFFSET;
      const { arrow } = directionFromDegrees(d);
      return `<text x="${x.toFixed(1)}" y="${y}" font-size="${graphConfig.FONT_SIZES.LABEL}" text-anchor="middle" fill="${graphConfig.COLORS.LABEL}">${arrow}</text>`;
    })
    .join("");

  // X-axis ticks (hours)
  const xTicks = graphConfig.STYLING.X_AXIS_TICKS;
  const xTickElems = new Array(xTicks + 1)
    .fill(0)
    .map((_, i) => {
      const t = xMin + ((xMax - xMin) * i) / xTicks;
      const x = xScale(t);
      const label = formatTime(new Date(t), "HOUR_ONLY");
      return `\n  <g>
    <line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${margin.TOP}" y2="${height - margin.BOTTOM}" stroke="${graphConfig.COLORS.GRID}" />
    <text x="${x.toFixed(1)}" y="${height - margin.BOTTOM + graphConfig.POSITIONING.X_AXIS_LABEL_OFFSET}" font-size="${graphConfig.FONT_SIZES.AXIS}" text-anchor="middle" fill="${graphConfig.COLORS.AXIS}">${label}</text>
  </g>`;
    })
    .join("");

  // Y-axis temp labels (min/mid/max) on left in selected units
  const tempLabel = (v: number) => (units === "imperial" ? `${Math.round(v)} °F` : `${Math.round(v)} °C`);
  const yLabels = [tMinDisp, (tMinDisp + tMaxDisp) / 2, tMaxDisp].map((v) => {
    const y = ty(v);
    return `<text x="${margin.LEFT + graphConfig.POSITIONING.Y_AXIS_LABEL_OFFSET}" y="${y.toFixed(1)}" font-size="${graphConfig.FONT_SIZES.AXIS}" text-anchor="end" alignment-baseline="middle" fill="${graphConfig.COLORS.AXIS}">${tempLabel(
      v,
    )}</text>`;
  });

  // Right-side precipitation labels (0, mid, max) in selected units
  const pLabel = (v: number) => (units === "imperial" ? `${Number(v.toFixed(2))} in` : `${v} mm`);
  const pLabels = [weatherConfig.precipitation.ZERO, pMaxDisp / 2, pMaxDisp].map((v) => {
    const y = py(v);
    return `<text x="${width - margin.RIGHT + graphConfig.POSITIONING.RIGHT_LABEL_OFFSET}" y="${y.toFixed(1)}" font-size="${graphConfig.FONT_SIZES.AXIS}" text-anchor="start" alignment-baseline="middle" fill="${graphConfig.COLORS.AXIS}" font-weight="500">${pLabel(
      v,
    )}</text>`;
  });

  // Add precipitation title on the right
  const precipTitle = `<text x="${width - margin.RIGHT + graphConfig.POSITIONING.RIGHT_LABEL_OFFSET}" y="${margin.TOP + graphConfig.POSITIONING.DAY_LABEL_OFFSET}" font-size="${graphConfig.FONT_SIZES.TITLE}" text-anchor="start" fill="${graphConfig.COLORS.PRECIPITATION}" font-weight="600">P (${units === "imperial" ? "in" : "mm"})</text>`;

  // Add temperature title on the left
  const tempTitle = `<text x="${margin.LEFT + graphConfig.POSITIONING.Y_AXIS_LABEL_OFFSET}" y="${margin.TOP + graphConfig.POSITIONING.DAY_LABEL_OFFSET}" font-size="${graphConfig.FONT_SIZES.TITLE}" text-anchor="end" fill="${graphConfig.COLORS.TEMPERATURE}" font-weight="600">T (${units === "imperial" ? "°F" : "°C"})</text>`;

  // Add precipitation grid lines for better readability
  const precipGridLines = [weatherConfig.precipitation.ZERO, pMaxDisp / 2, pMaxDisp].map((v) => {
    const y = py(v);
    return `<line x1="${margin.LEFT}" x2="${width - margin.RIGHT}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${graphConfig.COLORS.PRECIPITATION_GRID}" stroke-width="${graphConfig.LINE_STYLES.GRID_WIDTH}" opacity="${graphConfig.OPACITY.GRID_LINES}" />`;
  });

  // Add precipitation data points for better visibility
  const precipPoints = precsDisplay
    .map((p, i) => {
      if (p > weatherConfig.precipitation.ZERO) {
        const x = xScale(times[i]);
        const y = py(p);
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${graphConfig.PRECIPITATION_POINT_RADIUS}" fill="${graphConfig.COLORS.PRECIPITATION}" opacity="${graphConfig.OPACITY.PRECIPITATION_POINTS}" />`;
      }
      return "";
    })
    .filter(Boolean)
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    text { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
  </style>
  <rect width="100%" height="100%" fill="${graphConfig.COLORS.BACKGROUND}"/>
  <g>
    ${xTickElems}
    ${dayLinesAndLabels}
    ${yLabels.join("\n")}
    ${pLabels.join("\n")}
    ${precipGridLines.join("\n")}
    ${precipTitle}
    ${tempTitle}
    ${precipAreaFill}
    <path d="${precPath}" fill="none" stroke="${graphConfig.COLORS.PRECIPITATION}" stroke-width="${graphConfig.LINE_STYLES.PRECIPITATION_WIDTH}" stroke-dasharray="${graphConfig.STYLING.PRECIPITATION_DASH}" opacity="${graphConfig.OPACITY.PRECIPITATION_LINE}" stroke-linecap="round" stroke-linejoin="round" />
    <path d="${tempPath}" fill="none" stroke="${graphConfig.COLORS.TEMPERATURE}" stroke-width="${graphConfig.LINE_STYLES.TEMPERATURE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" />
    ${emojiLabels}
    ${sunLines}
    ${windLabels}
    ${precipPoints}
  </g>
</svg>`;

  // Add textual min/max using original units helpers (based on Celsius / mm)
  // Note: These values are calculated but not currently used in the display
  // const tMinC = minFinite(tempsC);
  // const tMaxC = maxFinite(tempsC);
  // const pMaxMm = maxFinite(precsMm);
  // Use HTML img with explicit dimensions to prevent layout shift
  const svgDataUri = `data:image/svg+xml;utf8,${svgToDataUri(svg)}`;
  const graphHtml = `<img src="${svgDataUri}" width="${width}" height="${height}" alt="Forecast graph" style="display:block;" />`;
  return { markdown: graphHtml };
}
