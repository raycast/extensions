/**
 * Weather Thresholds Configuration
 *
 * This file contains all weather-related thresholds and magic numbers used throughout the application.
 * All values are based on meteorological standards and best practices to ensure accurate weather classification.
 *
 * Sources:
 * - World Meteorological Organization (WMO) International Cloud Atlas
 * - American Meteorological Society (AMS) Glossary of Meteorology
 * - Norwegian Meteorological Institute (MET) standards
 * - Raycast extension best practices
 */

/**
 * Precipitation Intensity Thresholds (mm per hour)
 * Based on WMO International Cloud Atlas standards
 *
 * @see https://cloudatlas.wmo.int/en/rain.html
 * @see https://glossary.ametsoc.org/wiki/Rain
 */
export const PRECIPITATION_THRESHOLDS = {
  /**
   * Light precipitation threshold
   * WMO: Up to 2.5 mm per hour
   * Used for: Light rain, drizzle, light snow
   */
  LIGHT: 2.5,

  /**
   * Moderate precipitation threshold
   * WMO: 2.6-7.5 mm per hour
   * Used for: Values greater than this are moderate or higher
   * Note: This is the lower bound for moderate precipitation
   */
  MODERATE: 2.5,

  /**
   * Heavy precipitation threshold
   * WMO: More than 7.5 mm per hour
   * Used for: Values greater than this are heavy or higher
   * Note: This is the lower bound for heavy precipitation
   */
  HEAVY: 7.5,

  /**
   * Very heavy precipitation threshold
   * WMO: More than 10 mm per hour
   * Used for: Very heavy rain, torrential downpours
   */
  VERY_HEAVY: 10.0,

  /**
   * Minimum precipitation for display
   * Used for: Graph scaling and visibility thresholds
   */
  DISPLAY_MIN: 1,

  /**
   * Zero precipitation threshold
   * Used for: Graph area fill calculations
   */
  ZERO: 0,
} as const;

/**
 * Precipitation Coverage Thresholds (percentage of time period)
 * Used to determine precipitation chance levels based on coverage
 */
export const PRECIPITATION_COVERAGE_THRESHOLDS = {
  /**
   * High coverage threshold
   * When precipitation occurs for more than 70% of the time period
   */
  HIGH: 0.7,

  /**
   * Medium coverage threshold
   * When precipitation occurs for more than 40% of the time period
   */
  MEDIUM: 0.4,

  /**
   * Low coverage threshold
   * When precipitation occurs for more than 10% of the time period
   */
  LOW: 0.1,
} as const;

/**
 * Temperature Thresholds (°C)
 * Based on common meteorological classifications
 */
export const TEMPERATURE_THRESHOLDS = {
  /**
   * Freezing point
   * Used for: Ice formation, snow vs rain determination
   */
  FREEZING: 0,

  /**
   * Cold threshold
   * Used for: Cold weather warnings, winter conditions
   */
  COLD: -5,

  /**
   * Very cold threshold
   * Used for: Severe cold warnings, extreme winter conditions
   */
  VERY_COLD: -15,

  /**
   * Hot threshold
   * Used for: Heat warnings, summer conditions
   */
  HOT: 30,

  /**
   * Very hot threshold
   * Used for: Extreme heat warnings, dangerous conditions
   */
  VERY_HOT: 35,
} as const;

/**
 * Wind Speed Thresholds (m/s)
 * Based on Beaufort scale and meteorological standards
 */
export const WIND_THRESHOLDS = {
  /**
   * Light wind threshold
   * Beaufort scale: 1-3 (1-5 m/s)
   */
  LIGHT: 5,

  /**
   * Moderate wind threshold
   * Beaufort scale: 4-5 (6-10 m/s)
   */
  MODERATE: 10,

  /**
   * Strong wind threshold
   * Beaufort scale: 6-7 (11-17 m/s)
   */
  STRONG: 17,

  /**
   * Very strong wind threshold
   * Beaufort scale: 8+ (18+ m/s)
   */
  VERY_STRONG: 18,
} as const;

/**
 * UI and Display Thresholds
 * Configuration for user interface elements and display logic
 */
export const UI_THRESHOLDS = {
  /**
   * Search minimum character length
   * Used for: Location search input validation
   */
  SEARCH_MIN_CHARS: 3,

  /**
   * Coordinate precision for display
   * Used for: Latitude/longitude display formatting
   */
  COORDINATE_PRECISION: 3,

  /**
   * Default forecast hours
   * Used for: Default graph and forecast display period
   */
  DEFAULT_FORECAST_HOURS: 48,

  /**
   * Summary forecast days
   * Used for: 9-day summary view
   */
  SUMMARY_FORECAST_DAYS: 9,

  /**
   * Detailed forecast hours
   * Used for: 2-day detailed view
   */
  DETAILED_FORECAST_HOURS: 48,

  /**
   * Representative day period hours
   * Used for: Reducing forecast to key times of day
   * Based on meteorological conventions for morning, midday, afternoon, evening
   */
  REPRESENTATIVE_HOURS: [3, 9, 15, 21],
} as const;

/**
 * Graph and Visualization Thresholds
 * Configuration for charts, graphs, and visual elements
 */
export const GRAPH_THRESHOLDS = {
  /**
   * Graph dimensions
   */
  WIDTH: 800,
  HEIGHT: 280,

  /**
   * Graph margins (top, right, bottom, left)
   */
  MARGIN: {
    TOP: 28,
    RIGHT: 50,
    BOTTOM: 48,
    LEFT: 52,
  },

  /**
   * Temperature padding for graph scaling
   * Used to add visual padding around temperature range
   */
  TEMPERATURE_PADDING: 2,

  /**
   * Font sizes for graph elements
   */
  FONT_SIZES: {
    TITLE: 12,
    LABEL: 11,
    EMOJI: 14,
    AXIS: 11,
  },

  /**
   * Line styles and weights
   */
  LINE_STYLES: {
    TEMPERATURE_WIDTH: 2.5,
    PRECIPITATION_WIDTH: 2,
    GRID_WIDTH: 1,
    AXIS_WIDTH: 1.5,
  },

  /**
   * Circle radius for precipitation points
   */
  PRECIPITATION_POINT_RADIUS: 2,

  /**
   * Opacity values for graph elements
   */
  OPACITY: {
    PRECIPITATION_AREA: 0.3,
    PRECIPITATION_LINE: 0.9,
    PRECIPITATION_POINTS: 0.8,
    GRID_LINES: 0.6,
    AXIS_LINE: 0.8,
  },

  /**
   * Graph positioning and layout constants
   */
  POSITIONING: {
    /**
     * Emoji label vertical offset from temperature points
     * Used for: Weather emoji positioning above temperature line
     */
    EMOJI_OFFSET: -12,

    /**
     * Day boundary label vertical offset from top margin
     * Used for: Date labels above day boundary lines
     */
    DAY_LABEL_OFFSET: -8,

    /**
     * Sunrise/sunset label vertical offset from top margin
     * Used for: Sun emoji positioning below day boundary lines
     */
    SUN_LABEL_OFFSET: 12,

    /**
     * Wind direction label vertical offset from bottom margin
     * Used for: Wind arrow positioning below graph
     */
    WIND_LABEL_OFFSET: 20,

    /**
     * X-axis tick label vertical offset from bottom margin
     * Used for: Hour labels below x-axis
     */
    X_AXIS_LABEL_OFFSET: 36,

    /**
     * Y-axis label horizontal offset from left margin
     * Used for: Temperature labels to the left of y-axis
     */
    Y_AXIS_LABEL_OFFSET: -12,

    /**
     * Right-side label horizontal offset from right margin
     * Used for: Precipitation labels to the right of graph
     */
    RIGHT_LABEL_OFFSET: 12,
  },

  /**
   * Graph styling constants
   */
  STYLING: {
    /**
     * Day boundary line dash pattern
     * Used for: Vertical lines marking midnight boundaries
     */
    DAY_BOUNDARY_DASH: "3 3",

    /**
     * Sunrise/sunset line dash pattern
     * Used for: Vertical lines marking sun events
     */
    SUN_EVENT_DASH: "2 4",

    /**
     * Precipitation line dash pattern
     * Used for: Precipitation line styling
     */
    PRECIPITATION_DASH: "4 4",

    /**
     * Number of x-axis ticks for time labels
     * Used for: Hour markers on x-axis
     */
    X_AXIS_TICKS: 8,

    /**
     * Midnight hour for day boundary calculations
     * Used for: Aligning day boundaries to local midnight
     */
    MIDNIGHT_HOUR: 24,

    /**
     * Milliseconds in a day for date calculations
     * Used for: Incrementing day boundaries
     */
    MILLISECONDS_PER_DAY: 24 * 60 * 60 * 1000,
  },

  /**
   * Graph color constants
   */
  COLORS: {
    /**
     * Temperature line color
     */
    TEMPERATURE: "#ff6b6b",

    /**
     * Precipitation line and area color
     */
    PRECIPITATION: "#1e90ff",

    /**
     * Precipitation area fill color
     */
    PRECIPITATION_AREA: "#1e90ff",

    /**
     * Day boundary line color
     */
    DAY_BOUNDARY: "#ddd",

    /**
     * Sunrise line color
     */
    SUNRISE: "#ff6b35",

    /**
     * Sunset line color
     */
    SUNSET: "#6b46c1",

    /**
     * Grid line color
     */
    GRID: "#eee",

    /**
     * Precipitation grid color
     */
    PRECIPITATION_GRID: "#e6f3ff",

    /**
     * Label text color
     */
    LABEL: "#666",

    /**
     * Axis text color
     */
    AXIS: "#888",

    /**
     * Background color
     */
    BACKGROUND: "white",
  },
} as const;

/**
 * Timing and Performance Thresholds
 * Configuration for delays, timeouts, and performance optimization
 */
export const TIMING_THRESHOLDS = {
  /**
   * Search debounce delay (ms)
   * Used for: Preventing excessive API calls during typing
   */
  SEARCH_DEBOUNCE: 300,

  /**
   * Graph rendering delay (ms)
   * Used for: Smooth graph transitions and loading states
   * Note: 100ms delay prevents text from appearing before SVG graph
   */
  GRAPH_RENDER_DELAY: 100,

  /**
   * Error retry delay (ms)
   * Used for: Delayed error display to allow for recovery
   */
  ERROR_DISPLAY_DELAY: 150,

  /**
   * Component initialization delay (ms)
   * Used for: Smooth component transitions
   */
  COMPONENT_INIT_DELAY: 100,
} as const;

/**
 * Unit Conversion Constants
 * Used for converting between metric and imperial units
 */
export const UNIT_CONVERSION = {
  /**
   * Temperature conversion: Celsius to Fahrenheit
   * Formula: F = C * (9/5) + 32
   */
  CELSIUS_TO_FAHRENHEIT: {
    MULTIPLIER: 9 / 5,
    OFFSET: 32,
  },

  /**
   * Speed conversion: m/s to mph
   * Formula: mph = m/s * 2.236936
   */
  MS_TO_MPH: 2.236936,

  /**
   * Length conversion: mm to inches
   * Formula: inches = mm / 25.4
   */
  MM_TO_INCHES: 1 / 25.4,
} as const;

/**
 * Error Handling Thresholds
 * Configuration for error boundaries and retry logic
 */
export const ERROR_THRESHOLDS = {
  /**
   * Maximum retry attempts for error boundaries
   */
  MAX_RETRIES: 3,

  /**
   * Maximum retry attempts for API calls
   */
  MAX_API_RETRIES: 3,

  /**
   * Timeout for network requests (ms)
   */
  NETWORK_TIMEOUT: 10000,
} as const;

/**
 * Cache TTL Thresholds (milliseconds)
 * Configuration for data caching and refresh intervals
 */
export const CACHE_THRESHOLDS = {
  /**
   * Weather data cache TTL
   * 30 minutes - balances freshness with performance
   */
  WEATHER: 30 * 60 * 1000,

  /**
   * Sunrise/sunset data cache TTL
   * 6 hours - changes slowly throughout the day
   */
  SUNRISE: 6 * 60 * 60 * 1000,

  /**
   * Location search cache TTL
   * 1 hour - locations don't change frequently
   */
  LOCATION_SEARCH: 60 * 60 * 1000,
} as const;

/**
 * Legacy compatibility - maps old threshold names to new ones
 * @deprecated Use the specific threshold constants above
 */
export const LEGACY_THRESHOLDS = {
  HIGH_THRESHOLD: PRECIPITATION_THRESHOLDS.HEAVY,
  MEDIUM_THRESHOLD: PRECIPITATION_THRESHOLDS.MODERATE,
} as const;
