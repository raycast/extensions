import type { ApiChartPeriod } from "./api";

export interface Period {
  id: "1h" | "1d" | "1w" | "1m" | "1y" | "max";
  label: string;
  apiPeriod: ApiChartPeriod;
  /** Completes "+1.23% ($45.67) · …" */
  caption: string;
}

export const PERIODS: Period[] = [
  { id: "1h", label: "1H", apiPeriod: "hour", caption: "Past hour" },
  { id: "1d", label: "1D", apiPeriod: "day", caption: "Past 24 hours" },
  { id: "1w", label: "1W", apiPeriod: "week", caption: "Past week" },
  { id: "1m", label: "1M", apiPeriod: "month", caption: "Past month" },
  { id: "1y", label: "1Y", apiPeriod: "year", caption: "Past year" },
  { id: "max", label: "Max", apiPeriod: "max", caption: "All time" },
];

export const DEFAULT_PERIOD = PERIODS[1];
