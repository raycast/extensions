/**
 * Weather Thresholds Configuration
 *
 * All weather-related thresholds and magic numbers used throughout the application.
 *
 * Sources:
 * - World Meteorological Organization (WMO) International Cloud Atlas
 * - American Meteorological Society (AMS) Glossary of Meteorology
 * - Norwegian Meteorological Institute (MET) standards
 */

/**
 * Precipitation Intensity Thresholds (mm per hour)
 * @see https://cloudatlas.wmo.int/en/rain.html
 * @see https://glossary.ametsoc.org/wiki/Rain
 */
export const PRECIPITATION_THRESHOLDS = {
  // WMO: up to 2.5 mm/h
  LIGHT: 2.5,
  // WMO: 2.6–7.5 mm/h; lower bound for moderate
  MODERATE: 2.5,
  // WMO: > 7.5 mm/h; lower bound for heavy
  HEAVY: 7.5,
  VERY_HEAVY: 10.0,
  DISPLAY_MIN: 1,
  ZERO: 0,
} as const;

/** Precipitation Coverage Thresholds (fraction of time period with precipitation) */
export const PRECIPITATION_COVERAGE_THRESHOLDS = {
  HIGH: 0.7,
  MEDIUM: 0.4,
  LOW: 0.1,
} as const;

/** Temperature Thresholds (°C) */
export const TEMPERATURE_THRESHOLDS = {
  FREEZING: 0,
  COLD: -5,
  VERY_COLD: -15,
  HOT: 30,
  VERY_HOT: 35,
} as const;

/**
 * Wind Speed Thresholds (m/s)
 * Based on Beaufort scale.
 */
export const WIND_THRESHOLDS = {
  LIGHT: 5, // Beaufort 1–3
  MODERATE: 10, // Beaufort 4–5
  STRONG: 17, // Beaufort 6–7
  VERY_STRONG: 18, // Beaufort 8+
} as const;

/** UI and Display Thresholds */
export const UI_THRESHOLDS = {
  SEARCH_MIN_CHARS: 3,
  COORDINATE_PRECISION: 3,
  DEFAULT_FORECAST_HOURS: 48,
  SUMMARY_FORECAST_DAYS: 9,
  DETAILED_FORECAST_HOURS: 48,
  // Key times of day for representative day periods (based on MET conventions)
  REPRESENTATIVE_HOURS: [3, 9, 15, 21],
} as const;

export const GRAPH_COLORS_LIGHT = {
  TEMPERATURE: "#ff6b6b",
  PRECIPITATION: "#1e90ff",
  PRECIPITATION_AREA: "#1e90ff",
  DAY_BOUNDARY: "#ddd",
  SUNRISE: "#ff4500",
  SUNSET: "#8b008b",
  GRID: "#eee",
  PRECIPITATION_GRID: "#e6f3ff",
  LABEL: "#666",
  AXIS: "#888",
  BACKGROUND: "white",
} as const;

export type GraphColorPalette = Record<keyof typeof GRAPH_COLORS_LIGHT, string>;

export const GRAPH_COLORS_DARK: GraphColorPalette = {
  TEMPERATURE: "#ff6b6b",
  PRECIPITATION: "#1e90ff",
  PRECIPITATION_AREA: "#1e90ff",
  DAY_BOUNDARY: "#2a3a45",
  SUNRISE: "#ff4500",
  SUNSET: "#da70d6",
  GRID: "#1f2a33",
  PRECIPITATION_GRID: "#102533",
  LABEL: "#c7d1db",
  AXIS: "#aab8c2",
  BACKGROUND: "#0b0f14",
};

/** Graph and Visualization Thresholds */
export const GRAPH_THRESHOLDS = {
  WIDTH: 800,
  HEIGHT: 280,
  MARGIN: {
    TOP: 28,
    RIGHT: 50,
    BOTTOM: 48,
    LEFT: 52,
  },
  // Visual padding around temperature range
  TEMPERATURE_PADDING: 2,
  FONT_SIZES: {
    TITLE: 12,
    LABEL: 11,
    EMOJI: 14,
    AXIS: 11,
  },
  LINE_STYLES: {
    TEMPERATURE_WIDTH: 2.5,
    PRECIPITATION_WIDTH: 2,
    GRID_WIDTH: 1,
    AXIS_WIDTH: 1.5,
  },
  PRECIPITATION_POINT_RADIUS: 2,
  OPACITY: {
    PRECIPITATION_AREA: 0.3,
    PRECIPITATION_LINE: 0.9,
    PRECIPITATION_POINTS: 0.8,
    GRID_LINES: 0.6,
    AXIS_LINE: 0.8,
  },
  POSITIONING: {
    EMOJI_OFFSET: -12,
    DAY_LABEL_OFFSET: -8,
    SUN_LABEL_OFFSET: 12,
    WIND_LABEL_OFFSET: 20,
    X_AXIS_LABEL_OFFSET: 36,
    Y_AXIS_LABEL_OFFSET: -12,
    RIGHT_LABEL_OFFSET: 12,
  },
  STYLING: {
    DAY_BOUNDARY_DASH: "3 3",
    SUN_EVENT_DASH: "4 6",
    PRECIPITATION_DASH: "4 4",
    X_AXIS_TICKS: 8,
    MIDNIGHT_HOUR: 24,
    MILLISECONDS_PER_DAY: 24 * 60 * 60 * 1000,
  },
  COLORS: GRAPH_COLORS_LIGHT,
} as const;

/**
 * Timing and Performance Thresholds (ms)
 */
export const TIMING_THRESHOLDS = {
  SEARCH_DEBOUNCE: 300,
  // 100ms delay prevents text from appearing before the SVG graph renders
  GRAPH_RENDER_DELAY: 100,
  ERROR_DISPLAY_DELAY: 150,
  COMPONENT_INIT_DELAY: 100,
} as const;

/** Unit Conversion Constants */
export const UNIT_CONVERSION = {
  // F = C * (9/5) + 32
  CELSIUS_TO_FAHRENHEIT: {
    MULTIPLIER: 9 / 5,
    OFFSET: 32,
  },
  // mph = m/s * 2.236936
  MS_TO_MPH: 2.236936,
  // inches = mm / 25.4
  MM_TO_INCHES: 1 / 25.4,
} as const;

/** Error Handling Thresholds */
export const ERROR_THRESHOLDS = {
  MAX_RETRIES: 3,
  MAX_API_RETRIES: 3,
  NETWORK_TIMEOUT: 10000,
} as const;

/**
 * Cache TTL Thresholds (milliseconds)
 *
 * GRAPH_VERSION: increment to invalidate all cached graphs when the graph format changes.
 */
export const CACHE_THRESHOLDS = {
  // 30 minutes — balances freshness with performance
  WEATHER: 30 * 60 * 1000,
  // 6 hours — changes slowly throughout the day
  SUNRISE: 6 * 60 * 60 * 1000,
  // 1 hour — locations don't change frequently
  LOCATION_SEARCH: 60 * 60 * 1000,
  // 2 hours — graphs are expensive to generate
  GRAPH: 2 * 60 * 60 * 1000,
  GRAPH_VERSION: "1.2.1",
} as const;
