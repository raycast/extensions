import { Detail, Action, ActionPanel, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { type TimeseriesEntry } from "./weather-client";
import { precipitationAmount, symbolCode } from "./utils-forecast";
import { getSunTimes, type SunTimes } from "./sunrise-client";
import { scaleLinear } from "d3-scale";
import { line, curveMonotoneX } from "d3-shape";
import { formatPrecip, formatTemperatureCelsius, getUnits } from "./units";
import { symbolToEmoji } from "./utils/weather-symbols";
import { directionFromDegrees } from "./weather-utils";
import { minFinite, maxFinite, svgToDataUri } from "./graph-utils";
import { useWeatherData } from "./hooks/useWeatherData";
import { generateNoForecastDataMessage } from "./utils/error-messages";
import { formatDate, formatTime } from "./utils/date-utils";
import { addFavorite, removeFavorite, isFavorite as checkIsFavorite, type FavoriteLocation } from "./storage";

export default function GraphView(props: {
  name: string;
  lat: number;
  lon: number;
  hours?: number;
  onShowWelcome?: () => void;
}) {
  const { name, lat, lon, hours = 48, onShowWelcome } = props;
  const [sunByDate, setSunByDate] = useState<Record<string, SunTimes>>({});
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const { series, loading, showNoData } = useWeatherData(lat, lon);

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

    // Add a small delay to ensure graph generation is complete
    // This prevents the table from appearing before the graph is ready
    const graphMarkdown = buildGraphMarkdown(name, series, hours, { sunByDate });

    return graphMarkdown;
  }, [name, series, hours, sunByDate, showNoData, loading]);

  // Add a small delay to ensure graph is fully rendered before showing content
  const [graphReady, setGraphReady] = useState(false);

  useEffect(() => {
    if (!loading && series.length > 0) {
      // Small delay to ensure graph SVG is fully generated and rendered
      const timer = setTimeout(() => {
        setGraphReady(true);
      }, 100);

      return () => clearTimeout(timer);
    } else {
      setGraphReady(false);
    }
  }, [loading, series.length]);

  // Only show content when graph is ready
  const finalMarkdown = graphReady ? markdown : "";

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

export function buildGraphMarkdown(
  name: string,
  series: TimeseriesEntry[],
  hours: number,
  opts?: { sunByDate?: Record<string, SunTimes>; title?: string; smooth?: boolean },
): { markdown: string } {
  const subset = series.slice(0, hours);
  const width = 800;
  const height = 280;
  const margin = { top: 28, right: 50, bottom: 48, left: 52 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const units = getUnits();
  const times = subset.map((s) => new Date(s.time).getTime());
  const tempsC = subset.map((s) => s.data?.instant?.details?.air_temperature ?? NaN);
  const tempsDisplay = tempsC.map((c) =>
    units === "imperial" && Number.isFinite(c) ? (c as number) * (9 / 5) + 32 : c,
  );
  const precsMm = subset.map((s) => precipitationAmount(s) ?? 0);
  const precsDisplay = precsMm.map((mm) => (units === "imperial" ? mm / 25.4 : mm));
  const dirs = subset.map((s) => s.data?.instant?.details?.wind_from_direction);
  const symbols = subset.map((s) => symbolCode(s) ?? "");

  const xMin = times[0] ?? 0;
  const xMax = times[times.length - 1] ?? 1;
  const xScale = scaleLinear()
    .domain([xMin, xMax])
    .range([margin.left, margin.left + innerWidth]);

  const tMinDisp = minFinite(tempsDisplay) ?? 0;
  const tMaxDisp = maxFinite(tempsDisplay) ?? 1;
  const tPad = 2;
  const yT = scaleLinear()
    .domain([tMinDisp - tPad, tMaxDisp + tPad])
    .range([margin.top + innerHeight, margin.top]);
  const ty = (v: number) => yT(v);

  const pMaxDisp = Math.max(1, maxFinite(precsDisplay) ?? 1);
  const yP = scaleLinear()
    .domain([0, pMaxDisp])
    .range([margin.top + innerHeight, margin.top]);
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
  const precipAreaFill = `<path d="${precAreaPath} L ${xScale(times[times.length - 1])} ${py(0)} L ${xScale(times[0])} ${py(0)} Z" fill="#1e90ff" opacity="0.1" stroke-linejoin="round" />`;

  // Emoji labels for weather above temperature points
  const emojiLabels = times
    .map((t, i) => {
      const x = xScale(t);
      const y = ty(tempsDisplay[i] ?? 0) - 12;
      const e = symbolToEmoji(symbols[i]);
      return e ? `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="14" text-anchor="middle">${e}</text>` : "";
    })
    .join("");

  // Date boundary lines (midnights) and labels at the top
  const dayLinesAndLabels = (() => {
    if (times.length === 0) return "";
    const start = new Date(times[0]);
    const end = new Date(times[times.length - 1]);
    // Align to local midnight after start
    const firstMidnight = new Date(start);
    firstMidnight.setHours(24, 0, 0, 0);
    const parts: string[] = [];
    for (let d = firstMidnight; d.getTime() < end.getTime(); d = new Date(d.getTime() + 24 * 3600 * 1000)) {
      const x = xScale(d.getTime());
      const label = formatDate(d, "SHORT_DAY");
      parts.push(
        `<g>
          <line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${margin.top}" y2="${height - margin.bottom}" stroke="#ddd" stroke-dasharray="3 3" />
          <text x="${x.toFixed(1)}" y="${margin.top - 8}" font-size="11" text-anchor="middle" fill="#666">${label}</text>
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
            <line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${margin.top}" y2="${height - margin.bottom}" stroke="#f0b429" stroke-dasharray="2 4" />
            <text x="${x.toFixed(1)}" y="${margin.top + 12}" font-size="12" text-anchor="middle">🌅</text>
          </g>`,
        );
      }
      if (ss && ss >= xMin && ss <= xMax) {
        const x = xScale(ss);
        parts.push(
          `<g>
            <line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${margin.top}" y2="${height - margin.bottom}" stroke="#a06cd5" stroke-dasharray="2 4" />
            <text x="${x.toFixed(1)}" y="${margin.top + 12}" font-size="12" text-anchor="middle">🌇</text>
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
      const y = height - margin.bottom + 20;
      const { arrow } = directionFromDegrees(d);
      return `<text x="${x.toFixed(1)}" y="${y}" font-size="12" text-anchor="middle" fill="#666">${arrow}</text>`;
    })
    .join("");

  // X-axis ticks (hours)
  const xTicks = 8;
  const xTickElems = new Array(xTicks + 1)
    .fill(0)
    .map((_, i) => {
      const t = xMin + ((xMax - xMin) * i) / xTicks;
      const x = xScale(t);
      const label = formatTime(new Date(t), "HOUR_ONLY");
      return `\n  <g>
    <line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${margin.top}" y2="${height - margin.bottom}" stroke="#eee" />
    <text x="${x.toFixed(1)}" y="${height - margin.bottom + 36}" font-size="11" text-anchor="middle" fill="#888">${label}</text>
  </g>`;
    })
    .join("");

  // Y-axis temp labels (min/mid/max) on left in selected units
  const tempLabel = (v: number) => (units === "imperial" ? `${Math.round(v)} °F` : `${Math.round(v)} °C`);
  const yLabels = [tMinDisp, (tMinDisp + tMaxDisp) / 2, tMaxDisp].map((v) => {
    const y = ty(v);
    return `<text x="${margin.left - 12}" y="${y.toFixed(1)}" font-size="11" text-anchor="end" alignment-baseline="middle" fill="#888">${tempLabel(
      v,
    )}</text>`;
  });

  // Right-side precipitation labels (0, mid, max) in selected units
  const pLabel = (v: number) => (units === "imperial" ? `${Number(v.toFixed(2))} in` : `${v} mm`);
  const pLabels = [0, pMaxDisp / 2, pMaxDisp].map((v) => {
    const y = py(v);
    return `<text x="${width - margin.right + 12}" y="${y.toFixed(1)}" font-size="11" text-anchor="start" alignment-baseline="middle" fill="#888" font-weight="500">${pLabel(
      v,
    )}</text>`;
  });

  // Add precipitation axis line on the right
  const precipAxisLine = `<line x1="${width - margin.right}" x2="${width - margin.right}" y1="${margin.top}" y2="${height - margin.bottom}" stroke="#1e90ff" stroke-width="1.5" opacity="0.8" />`;

  // Add precipitation title on the right
  const precipTitle = `<text x="${width - margin.right + 12}" y="${margin.top - 8}" font-size="12" text-anchor="start" fill="#1e90ff" font-weight="600">P (${units === "imperial" ? "in" : "mm"})</text>`;

  // Add temperature title on the left
  const tempTitle = `<text x="${margin.left - 12}" y="${margin.top - 8}" font-size="12" text-anchor="end" fill="#ff6b6b" font-weight="600">T (${units === "imperial" ? "°F" : "°C"})</text>`;

  // Add precipitation grid lines for better readability
  const precipGridLines = [0, pMaxDisp / 2, pMaxDisp].map((v) => {
    const y = py(v);
    return `<line x1="${margin.left}" x2="${width - margin.right}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e6f3ff" stroke-width="1" opacity="0.6" />`;
  });

  // Add precipitation data points for better visibility
  const precipPoints = precsDisplay
    .map((p, i) => {
      if (p > 0) {
        const x = xScale(times[i]);
        const y = py(p);
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2" fill="#1e90ff" opacity="0.8" />`;
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
  <rect width="100%" height="100%" fill="white"/>
  <g>
    ${xTickElems}
    ${dayLinesAndLabels}
    ${yLabels.join("\n")}
    ${pLabels.join("\n")}
    ${precipGridLines.join("\n")}
    ${precipAxisLine}
    ${precipTitle}
    ${tempTitle}
    ${precipAreaFill}
    <path d="${precPath}" fill="none" stroke="#1e90ff" stroke-width="2" stroke-dasharray="4 4" opacity="0.9" stroke-linecap="round" stroke-linejoin="round" />
    <path d="${tempPath}" fill="none" stroke="#ff6b6b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
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
  const titleLabel = opts?.title ?? `${hours}h forecast`;
  const md = `# ${name} – ${titleLabel}\n\n![forecast](data:image/svg+xml;utf8,${svgToDataUri(svg)})\n\nMin ${tMinText ?? "N/A"} • Max ${tMaxText ?? "N/A"} • Max precip ${pMaxText ?? "N/A"}`;
  return { markdown: md };
}
