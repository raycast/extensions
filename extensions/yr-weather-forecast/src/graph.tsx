import { Detail } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getForecast, type TimeseriesEntry } from "./weather-client";
import { precipitationAmount, symbolCode } from "./utils-forecast";
import { getSunTimes, type SunTimes } from "./sunrise-client";
import { scaleLinear } from "d3-scale";
import { line, curveMonotoneX } from "d3-shape";
import { formatPrecip, formatTemperatureCelsius, getUnits } from "./units";
import { symbolToEmoji } from "./weather-emoji";
import { directionFromDegrees } from "./weather-utils";
import { minFinite, maxFinite, svgToDataUri } from "./graph-utils";

export default function GraphView(props: { name: string; lat: number; lon: number; hours?: number }) {
  const { name, lat, lon, hours = 48 } = props;
  const [series, setSeries] = useState<TimeseriesEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [showNoData, setShowNoData] = useState(false);
  const [sunByDate, setSunByDate] = useState<Record<string, SunTimes>>({});

  useEffect(() => {
    let cancelled = false;
    let errorTimeout: NodeJS.Timeout;
    let noDataTimeout: NodeJS.Timeout;

    async function fetchData() {
      setLoading(true);
      setError(null);
      setShowError(false);
      setShowNoData(false);

      try {
        const data = await getForecast(lat, lon);
        if (!cancelled) {
          setSeries(data);
          setError(null);
          setShowError(false);
          setShowNoData(false);
        }
      } catch (err) {
        if (!cancelled) {
          setSeries([]); // Clear existing weather forecasts
          const errorMessage = err instanceof Error ? err.message : "Failed to fetch weather data";
          setError(errorMessage);

          // Delay showing error message by 150ms to give API time to catch up
          errorTimeout = setTimeout(() => {
            if (!cancelled) {
              setShowError(true);
            }
          }, 150);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);

          // Delay showing "no data" message by 150ms to give API time to catch up
          if (series.length === 0) {
            noDataTimeout = setTimeout(() => {
              if (!cancelled) {
                setShowNoData(true);
              }
            }, 150);
          }
        }
      }
    }
    fetchData();
    return () => {
      cancelled = true;
      if (errorTimeout) clearTimeout(errorTimeout);
      if (noDataTimeout) clearTimeout(noDataTimeout);
    };
  }, [lat, lon]);

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
            return [date, {} as SunTimes] as const;
          }
        }),
      );
      if (!cancelled) {
        const map: Record<string, SunTimes> = {};
        for (const [k, v] of entries) map[k] = v;
        setSunByDate(map);
      }
    }
    fetchSun();
    return () => {
      cancelled = true;
    };
  }, [series, hours, lat, lon]);

  const { markdown } = useMemo(() => {
    if (error && showError) {
      return {
        markdown: `## ⚠️ Data Fetch Failed

Unable to retrieve weather forecast data from the MET API.

**Error details:**
${error}

**Available options:**
- Check your internet connection
- Try again later
- Verify the location coordinates are correct`,
      };
    }

    if (series.length === 0 && showNoData) {
      return {
        markdown: `## ⚠️ No Forecast Data Available

No weather forecast data is currently available for this location.

**Available options:**
- Check the location coordinates
- Try refreshing the data
- Contact support if the issue persists`,
      };
    }

    return buildGraphMarkdown(name, series, hours, { sunByDate });
  }, [name, series, hours, sunByDate, error, showError, showNoData]);

  return <Detail isLoading={loading} markdown={markdown} />;
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
  const margin = { top: 28, right: 16, bottom: 48, left: 44 };
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
  if (opts?.smooth) tempLine.curve(curveMonotoneX);
  const tempPath = tempLine(tempsDisplay as number[]) || "";
  // Build precipitation path (dotted)
  const precLine = line<number>()
    .x((_: number, i: number) => xScale(times[i]))
    .y((_: number, i: number) => yP(precsDisplay[i] ?? 0));
  if (opts?.smooth) precLine.curve(curveMonotoneX);
  const precPath = precLine(precsDisplay as number[]) || "";

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
      const label = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
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
      const label = new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", hour12: false });
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
    return `<text x="${margin.left - 8}" y="${y.toFixed(1)}" font-size="11" text-anchor="end" alignment-baseline="middle" fill="#888">${tempLabel(
      v,
    )}</text>`;
  });

  // Right-side precipitation labels (0, mid, max) in selected units
  const pLabel = (v: number) => (units === "imperial" ? `${Number(v.toFixed(2))} in` : `${v} mm`);
  const pLabels = [0, pMaxDisp / 2, pMaxDisp].map((v) => {
    const y = py(v);
    return `<text x="${width - margin.right + 8}" y="${y.toFixed(1)}" font-size="11" text-anchor="start" alignment-baseline="middle" fill="#888">${pLabel(
      v,
    )}</text>`;
  });

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
    <path d="${precPath}" fill="none" stroke="#1e90ff" stroke-width="2" stroke-dasharray="4 4" opacity="0.9" />
    <path d="${tempPath}" fill="none" stroke="#ff6b6b" stroke-width="2.5" />
    ${emojiLabels}
    ${sunLines}
    ${windLabels}
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
