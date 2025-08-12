import { Action, ActionPanel, Detail } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getForecast, type TimeseriesEntry } from "./weather-client";
import { buildGraphMarkdown } from "./graph";
import { formatPrecip, formatTemperatureCelsius, formatWindSpeed } from "./units";
import { precipitationAmount, symbolCode } from "./utils-forecast";

export default function ForecastView(props: { name: string; lat: number; lon: number }) {
  const { name, lat, lon } = props;
  const [items, setItems] = useState<TimeseriesEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"detailed" | "summary">("detailed");

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const series = await getForecast(lat, lon);
        if (!cancelled) setItems(series);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  const byDay = useMemo(() => groupByDay(items), [items]);
  const reduced = useMemo(() => reduceToDayPeriods(items, 9), [items]);
  const displaySeries = mode === "detailed" ? items.slice(0, 48) : reduced;
  const graph = useMemo(() => {
    const title = mode === "detailed" ? "48h forecast" : "9-day summary";
    return buildGraphMarkdown(name, displaySeries, displaySeries.length, { title }).markdown;
  }, [name, displaySeries, mode]);
  const listMarkdown = useMemo(
    () => (mode === "detailed" ? buildListMarkdown(byDay) : buildSummaryListMarkdown(reduced)),
    [mode, byDay, reduced],
  );

  const markdown = [graph, "\n---\n", listMarkdown].join("\n");

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {mode === "detailed" ? (
            <Action title="Show 9-Day Summary" onAction={() => setMode("summary")} />
          ) : (
            <Action title="Show 2-Day Detailed" onAction={() => setMode("detailed")} />
          )}
        </ActionPanel>
      }
    />
  );
}

function groupByDay(series: TimeseriesEntry[]): Record<string, TimeseriesEntry[]> {
  return series.reduce<Record<string, TimeseriesEntry[]>>((acc, ts) => {
    const day = new Date(ts.time).toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    (acc[day] ||= []).push(ts);
    return acc;
  }, {});
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatTemp(ts: TimeseriesEntry): string | undefined {
  const details = ts?.data?.instant?.details ?? {};
  return formatTemperatureCelsius(details.air_temperature);
}

function buildListMarkdown(byDay: Record<string, TimeseriesEntry[]>): string {
  const sections: string[] = [];
  for (const [day, entries] of Object.entries(byDay)) {
    sections.push(`### ${day}`);
    sections.push("");
    sections.push("Time | Weather | Temp | Wind | Dir | Precip");
    sections.push("---|:--:|---:|---:|:--:|---:");
    for (const ts of entries) {
      const time = formatTime(ts.time);
      const emoji = emojiForTs(ts);
      const temp = formatTemp(ts) ?? "";
      const details = ts?.data?.instant?.details ?? {};
      const wind = formatWindSpeed(details.wind_speed) ?? "";
      const dir =
        typeof details.wind_from_direction === "number"
          ? (() => {
              const d = directionFromDegrees(details.wind_from_direction);
              return `${d.arrow} ${d.name}`;
            })()
          : "";
      const precip = precipitationAmount(ts);
      const p = formatPrecip(precip) ?? "";
      sections.push(`${time} | ${emoji} | ${temp} | ${wind} | ${dir} | ${p}`);
    }
    sections.push("");
  }
  return sections.join("\n");
}

function reduceToDayPeriods(series: TimeseriesEntry[], maxDays: number): TimeseriesEntry[] {
  const byDay = groupByDay(series);
  const dayKeys = Object.keys(byDay).slice(0, maxDays);
  const result: TimeseriesEntry[] = [];
  for (const day of dayKeys) {
    const entries = byDay[day];
    // Index by hour for quick lookup
    const byHour: Record<number, TimeseriesEntry> = {};
    for (const ts of entries) byHour[new Date(ts.time).getHours()] = ts;
    // Target representative hours: 03, 09, 15, 21
    const targets = [3, 9, 15, 21];
    for (const target of targets) {
      let chosen: TimeseriesEntry | undefined = undefined;
      for (let delta = 0; delta <= 2 && !chosen; delta++) {
        chosen = byHour[target] ?? byHour[target - delta] ?? byHour[target + delta];
      }
      if (chosen) result.push(chosen);
    }
  }
  return result;
}

function buildSummaryListMarkdown(series: TimeseriesEntry[]): string {
  // Group reduced series again by day for table rendering
  const byDay = groupByDay(series);
  const sections: string[] = [];
  for (const [day, entries] of Object.entries(byDay)) {
    // Sort by time
    entries.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    sections.push(`### ${day}`);
    sections.push("");
    sections.push("Period | Weather | Temp | Wind | Dir | Precip");
    sections.push("---|:--:|---:|---:|:--:|---:");
    for (const ts of entries) {
      const date = new Date(ts.time);
      const period = periodNameFromHour(date.getHours());
      const emoji = emojiForTs(ts);
      const temp = formatTemp(ts) ?? "";
      const details = ts?.data?.instant?.details ?? {};
      const wind = formatWindSpeed(details.wind_speed) ?? "";
      const dir =
        typeof details.wind_from_direction === "number"
          ? (() => {
              const d = directionFromDegrees(details.wind_from_direction);
              return `${d.arrow} ${d.name}`;
            })()
          : "";
      const precip = precipitationAmount(ts);
      const p = formatPrecip(precip) ?? "";
      sections.push(`${period} | ${emoji} | ${temp} | ${wind} | ${dir} | ${p}`);
    }
    sections.push("");
  }
  return sections.join("\n");
}

function periodNameFromHour(hour: number): "Night" | "Morning" | "Afternoon" | "Evening" {
  if (hour < 6) return "Night";
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

function emojiForTs(ts: TimeseriesEntry): string {
  const symbol = symbolCode(ts);
  if (!symbol) return "";
  const s = String(symbol).toLowerCase();
  if (s.includes("thunder")) return "⛈️";
  if (s.includes("sleet")) return "🌨️";
  if (s.includes("snow")) return "🌨️";
  if (s.includes("rain")) return s.includes("showers") ? "🌦️" : "🌧️";
  if (s.includes("fog")) return "🌫️";
  if (s.includes("partlycloudy")) return "🌤️";
  if (s.includes("cloudy")) return "☁️";
  if (s.includes("fair")) return s.includes("night") ? "🌙" : "🌤️";
  if (s.includes("clearsky")) return s.includes("night") ? "🌙" : "☀️";
  return "";
}

function directionFromDegrees(degrees: number): { arrow: string; name: string } {
  const d = ((degrees % 360) + 360) % 360;
  const names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"] as const;
  const index = Math.round(d / 45) % 8;
  return { arrow: arrows[index], name: names[index] };
}
