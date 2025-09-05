import { Detail, Action, ActionPanel, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { type TimeseriesEntry } from "./weather-client";
import { precipitationAmount, symbolCode } from "./utils-forecast";
import { getSunTimes, type SunTimes } from "./sunrise-client";
// Import only the specific D3 functions we need for tree-shaking
import { scaleLinear } from "d3-scale";
import { line, curveMonotoneX } from "d3-shape";
import { formatPrecip, formatTemperatureCelsius, getUnits } from "./units";
import { symbolToEmoji } from "./utils/weather-symbols";
import { directionFromDegrees, buildWeatherTable } from "./weather-utils";
import { minFinite, maxFinite, svgToDataUri } from "./graph-utils";
import { useWeatherData } from "./hooks/useWeatherData";
import { generateNoForecastDataMessage } from "./utils/error-messages";
import { formatDate, formatTime } from "./utils/date-utils";
import { addFavorite, removeFavorite, isFavorite as checkIsFavorite, type FavoriteLocation } from "./storage";
import { withErrorBoundary } from "./components/error-boundary";
import { GraphErrorFallback } from "./components/error-fallbacks";
import {
  getGraphThresholds,
  getUIThresholds,
  convertTemperature,
  convertPrecipitation,
  getWeatherConfig,
} from "./config/weather-config";

function GraphView(props: {
  name: string;
  lat: number;
  lon: number;
  hours?: number;
  onShowWelcome?: () => void;
  preCachedGraph?: string;
  preWarmedGraph?: string;
}) {
  const {
    name,
    lat,
    lon,
    hours = getUIThresholds().DEFAULT_FORECAST_HOURS,
    onShowWelcome,
    preCachedGraph,
    preWarmedGraph,
  } = props;
  const [sunByDate, setSunByDate] = useState<Record<string, SunTimes>>({});
  const [view, setView] = useState<"graph" | "data">("graph");
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const { series, loading, showNoData, preRenderedGraph } = useWeatherData(lat, lon, true);

  // Check if current location is in favorites
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const favLocation: FavoriteLocation = { name, lat, lon };
      const favorite = await checkIsFavorite(favLocation);
      setIsFavorite(favorite);
    };
    checkFavoriteStatus();
  }, [name, lat, lon]);

  // Fetch sunrise/sunset for visible dates once forecast is loaded
  useEffect(() => {
    let cancelled = false;
    async function fetchSun() {
      if (series.length === 0) return;
      const subset = series.slice(0, hours);
      const dates = Array.from(new Set(subset.map((s) => new Date(s.time)).map((d) => d.toISOString().slice(0, 10))));
      const entries = await Promise.all(
        dates.map(async (date: string) => {
          try {
            const v = await getSunTimes(lat, lon, date);
            return [date, v] as const;
          } catch {
            return [date, {} as SunTimes];
          }
        }),
      );
      if (!cancelled) {
        const map: Record<string, SunTimes> = {};
        for (const entry of entries) {
          const [date, sunTimes] = entry as [string, SunTimes];
          map[date] = sunTimes;
        }
        setSunByDate(map);
      }
    }
    fetchSun();
    return () => {
      cancelled = true;
    };
  }, [series, hours, lat, lon]);

  const { markdown } = useMemo(() => {
    // Don't show content until we have data or explicitly know there's no data
    if (loading) {
      return { markdown: "" };
    }
    if (series.length === 0 && showNoData) {
      return {
        markdown: generateNoForecastDataMessage({ locationName: name }),
      };
    }

    // Use pre-warmed graph if available, otherwise pre-cached graph, otherwise pre-rendered graph, otherwise generate new
    if (preWarmedGraph) {
      return { markdown: preWarmedGraph };
    }
    if (preCachedGraph) {
      return { markdown: preCachedGraph };
    }
    if (preRenderedGraph) {
      return { markdown: preRenderedGraph };
    }

    // Generate graph immediately - no delay needed
    const graphMarkdown = buildGraphMarkdown(name, series, hours, { sunByDate });

    return graphMarkdown;
  }, [name, series, hours, sunByDate, showNoData, loading, preWarmedGraph, preCachedGraph, preRenderedGraph]);

  // Generate data table for tab view
  const dataTable = useMemo(() => {
    if (loading || series.length === 0) return "";
    const subset = series.slice(0, hours);
    return buildWeatherTable(subset, { showDirection: true });
  }, [series, hours, loading]);

  // Generate content based on current view
  const finalMarkdown = useMemo(() => {
    if (loading) return "";
    if (series.length === 0 && showNoData) {
      return generateNoForecastDataMessage({ locationName: name });
    }

    const title = `# ${name} – ${hours}h forecast${view === "data" ? " (Data)" : ""}`;
    const content = view === "graph" ? markdown : dataTable;
    return [title, content].join("\n");
  }, [loading, series.length, showNoData, name, hours, view, markdown, dataTable]);

  const handleFavoriteToggle = async () => {
    const favLocation: FavoriteLocation = { name, lat, lon };

    try {
      if (isFavorite) {
        await removeFavorite(favLocation);
        setIsFavorite(false);
        await showToast({
          style: Toast.Style.Success,
          title: "Removed from Favorites",
          message: `${name} has been removed from your favorites`,
        });
      } else {
        await addFavorite(favLocation);
        setIsFavorite(true);
        await showToast({
          style: Toast.Style.Success,
          title: "Added to Favorites",
          message: `${name} has been added to your favorites`,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update favorites",
        message: String(error),
      });
    }
  };

  return (
    <Detail
      isLoading={loading}
      markdown={finalMarkdown}
      actions={
        <ActionPanel>
          {/* View switching actions */}
          {view === "graph" ? (
            <Action
              title="Show Data Table"
              icon={Icon.List}
              shortcut={{ modifiers: [], key: "d" }}
              onAction={() => setView("data")}
            />
          ) : (
            <Action
              title="Show Graph"
              icon={Icon.BarChart}
              shortcut={{ modifiers: [], key: "g" }}
              onAction={() => setView("graph")}
            />
          )}

          {isFavorite ? (
            <Action
              title="Remove from Favorites"
              icon={Icon.StarDisabled}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={handleFavoriteToggle}
            />
          ) : (
            <Action
              title="Add to Favorites"
              icon={Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={handleFavoriteToggle}
            />
          )}

          {onShowWelcome && (
            <Action
              title="Show Welcome Message"
              icon={Icon.Info}
              onAction={onShowWelcome}
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

// Export with error boundary
export default withErrorBoundary(GraphView, {
  componentName: "Graph View",
  fallback: <GraphErrorFallback componentName="Graph View" />,
});

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
            <line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${margin.TOP}" y2="${height - margin.BOTTOM}" stroke="${graphConfig.COLORS.SUNRISE}" stroke-dasharray="${graphConfig.STYLING.SUN_EVENT_DASH}" />
            <text x="${x.toFixed(1)}" y="${margin.TOP + graphConfig.POSITIONING.SUN_LABEL_OFFSET}" font-size="${graphConfig.FONT_SIZES.LABEL}" text-anchor="middle">🌅</text>
          </g>`,
        );
      }
      if (ss && ss >= xMin && ss <= xMax) {
        const x = xScale(ss);
        parts.push(
          `<g>
            <line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${margin.TOP}" y2="${height - margin.BOTTOM}" stroke="${graphConfig.COLORS.SUNSET}" stroke-dasharray="${graphConfig.STYLING.SUN_EVENT_DASH}" />
            <text x="${x.toFixed(1)}" y="${margin.TOP + graphConfig.POSITIONING.SUN_LABEL_OFFSET}" font-size="${graphConfig.FONT_SIZES.LABEL}" text-anchor="middle">🌇</text>
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

  // Precipitation axis line removed - white background grid is sufficient

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
  const tMinC = minFinite(tempsC);
  const tMaxC = maxFinite(tempsC);
  const pMaxMm = maxFinite(precsMm);
  const tMinText = formatTemperatureCelsius(tMinC);
  const tMaxText = formatTemperatureCelsius(tMaxC);
  const pMaxText = formatPrecip(pMaxMm);
  // Use HTML img with explicit dimensions to prevent layout shift
  const svgDataUri = `data:image/svg+xml;utf8,${svgToDataUri(svg)}`;
  const graphHtml = `<img src="${svgDataUri}" width="${width}" height="${height}" alt="Forecast graph" style="display:block;" />`;
  const md = `${graphHtml}\n\nMin ${tMinText ?? "N/A"} • Max ${tMaxText ?? "N/A"} • Max precip ${pMaxText ?? "N/A"}`;
  return { markdown: md };
}
