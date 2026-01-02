import {
  PRECIPITATION_THRESHOLDS,
  PRECIPITATION_COVERAGE_THRESHOLDS,
  TEMPERATURE_THRESHOLDS,
  WIND_THRESHOLDS,
  UI_THRESHOLDS,
  GRAPH_THRESHOLDS,
  TIMING_THRESHOLDS,
  UNIT_CONVERSION,
  ERROR_THRESHOLDS,
  CACHE_THRESHOLDS,
} from "./weather-thresholds";

/**
 * Weather Configuration Manager
 *
 * Provides a centralized way to manage and override weather-related thresholds.
 * Allows for runtime configuration changes and provides type-safe access to all thresholds.
 */

export interface WeatherConfig {
  precipitation: typeof PRECIPITATION_THRESHOLDS;
  precipitationCoverage: typeof PRECIPITATION_COVERAGE_THRESHOLDS;
  temperature: typeof TEMPERATURE_THRESHOLDS;
  wind: typeof WIND_THRESHOLDS;
  ui: typeof UI_THRESHOLDS;
  graph: typeof GRAPH_THRESHOLDS;
  timing: typeof TIMING_THRESHOLDS;
  unitConversion: typeof UNIT_CONVERSION;
  error: typeof ERROR_THRESHOLDS;
  cache: typeof CACHE_THRESHOLDS;
}

/**
 * Default weather configuration
 * Uses all the standard meteorological thresholds
 */
export const DEFAULT_WEATHER_CONFIG: WeatherConfig = {
  precipitation: PRECIPITATION_THRESHOLDS,
  precipitationCoverage: PRECIPITATION_COVERAGE_THRESHOLDS,
  temperature: TEMPERATURE_THRESHOLDS,
  wind: WIND_THRESHOLDS,
  ui: UI_THRESHOLDS,
  graph: GRAPH_THRESHOLDS,
  timing: TIMING_THRESHOLDS,
  unitConversion: UNIT_CONVERSION,
  error: ERROR_THRESHOLDS,
  cache: CACHE_THRESHOLDS,
};

/**
 * Weather Configuration Manager Class
 * Provides methods to get, set, and reset weather configuration
 */
export class WeatherConfigManager {
  private config: WeatherConfig;

  constructor(initialConfig: WeatherConfig = DEFAULT_WEATHER_CONFIG) {
    this.config = { ...initialConfig };
  }

  /**
   * Get the current configuration
   */
  getConfig(): WeatherConfig {
    return { ...this.config };
  }

  /**
   * Get a specific threshold category
   */
  getThresholds<K extends keyof WeatherConfig>(category: K): WeatherConfig[K] {
    return this.config[category];
  }

  /**
   * Get a specific threshold value
   */
  getThreshold<K extends keyof WeatherConfig, T extends keyof WeatherConfig[K]>(
    category: K,
    threshold: T,
  ): WeatherConfig[K][T] {
    return this.config[category][threshold];
  }

  /**
   * Update a specific threshold value
   */
  setThreshold<K extends keyof WeatherConfig, T extends keyof WeatherConfig[K]>(
    category: K,
    threshold: T,
    value: WeatherConfig[K][T],
  ): void {
    this.config[category] = {
      ...this.config[category],
      [threshold]: value,
    };
  }

  /**
   * Update an entire threshold category
   */
  setThresholds<K extends keyof WeatherConfig>(category: K, thresholds: Partial<WeatherConfig[K]>): void {
    this.config[category] = {
      ...this.config[category],
      ...thresholds,
    };
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_WEATHER_CONFIG };
  }

  /**
   * Update the entire configuration
   */
  updateConfig(newConfig: Partial<WeatherConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Get precipitation chance level based on intensity and coverage
   */
  getPrecipitationChanceLevel(maxIntensity: number, coverageRatio: number): "none" | "low" | "medium" | "high" {
    const { LIGHT, MODERATE, HEAVY } = this.config.precipitation;
    const { LOW, MEDIUM, HIGH } = this.config.precipitationCoverage;

    if (maxIntensity === 0) return "none";
    if (maxIntensity > HEAVY || coverageRatio > HIGH) return "high";
    if (maxIntensity > MODERATE || coverageRatio > MEDIUM) return "medium";
    if (maxIntensity > LIGHT || coverageRatio > LOW) return "low";
    return "none";
  }

  /**
   * Get temperature classification
   */
  getTemperatureClassification(temp: number): "very_cold" | "cold" | "normal" | "hot" | "very_hot" {
    const { VERY_COLD, COLD, HOT, VERY_HOT } = this.config.temperature;

    if (temp <= VERY_COLD) return "very_cold";
    if (temp <= COLD) return "cold";
    if (temp >= VERY_HOT) return "very_hot";
    if (temp >= HOT) return "hot";
    return "normal";
  }

  /**
   * Get wind classification
   */
  getWindClassification(speed: number): "light" | "moderate" | "strong" | "very_strong" {
    const { MODERATE, STRONG, VERY_STRONG } = this.config.wind;

    if (speed >= VERY_STRONG) return "very_strong";
    if (speed >= STRONG) return "strong";
    if (speed >= MODERATE) return "moderate";
    return "light";
  }

  /**
   * Convert temperature between units
   */
  convertTemperature(celsius: number, toImperial: boolean): number {
    if (!toImperial) return celsius;
    const { MULTIPLIER, OFFSET } = this.config.unitConversion.CELSIUS_TO_FAHRENHEIT;
    return celsius * MULTIPLIER + OFFSET;
  }

  /**
   * Convert speed between units
   */
  convertSpeed(ms: number, toImperial: boolean): number {
    if (!toImperial) return ms;
    return ms * this.config.unitConversion.MS_TO_MPH;
  }

  /**
   * Convert precipitation between units
   */
  convertPrecipitation(mm: number, toImperial: boolean): number {
    if (!toImperial) return mm;
    return mm * this.config.unitConversion.MM_TO_INCHES;
  }
}

/**
 * Global weather configuration instance
 * This is the main instance used throughout the application
 */
export const weatherConfig = new WeatherConfigManager();

/**
 * Convenience functions for accessing the global configuration
 */
export const getWeatherConfig = () => weatherConfig.getConfig();
export const getPrecipitationThresholds = () => weatherConfig.getThresholds("precipitation");
export const getTemperatureThresholds = () => weatherConfig.getThresholds("temperature");
export const getWindThresholds = () => weatherConfig.getThresholds("wind");
export const getUIThresholds = () => weatherConfig.getThresholds("ui");
export const getGraphThresholds = () => weatherConfig.getThresholds("graph");
export const getTimingThresholds = () => weatherConfig.getThresholds("timing");
export const getErrorThresholds = () => weatherConfig.getThresholds("error");
export const getCacheThresholds = () => weatherConfig.getThresholds("cache");

/**
 * Convenience functions for common threshold access
 */
export const getPrecipitationChanceLevel = (maxIntensity: number, coverageRatio: number) =>
  weatherConfig.getPrecipitationChanceLevel(maxIntensity, coverageRatio);

export const getTemperatureClassification = (temp: number) => weatherConfig.getTemperatureClassification(temp);

export const getWindClassification = (speed: number) => weatherConfig.getWindClassification(speed);

/**
 * Unit conversion convenience functions
 */
export const convertTemperature = (celsius: number, toImperial: boolean) =>
  weatherConfig.convertTemperature(celsius, toImperial);

export const convertSpeed = (ms: number, toImperial: boolean) => weatherConfig.convertSpeed(ms, toImperial);

export const convertPrecipitation = (mm: number, toImperial: boolean) =>
  weatherConfig.convertPrecipitation(mm, toImperial);
