import { formatDate } from "./date-utils";

/**
 * Centralized error message templates for weather-related errors
 * This consolidates all error message markdown templates into a single source of truth
 */

export interface ErrorMessageOptions {
  locationName?: string;
  date?: Date;
  errorDetails?: string;
}

/**
 * Generate "No Forecast Data Available" error message
 * Used when weather data cannot be retrieved or is unavailable
 */
export function generateNoForecastDataMessage(options: ErrorMessageOptions = {}): string {
  const { locationName, date } = options;

  let title = "## ⚠️ No Forecast Data Available";
  let description = "No weather forecast data is currently available for this location.";

  // Customize message based on context
  if (date) {
    title = `## ⚠️ No Forecast Data Available\n\n**${formatDate(date, "LONG_DAY")}**`;

    description = "The requested date is beyond the available forecast range (typically 9-10 days).";
  }

  if (locationName) {
    description = `No weather forecast data is currently available for ${locationName}.`;
  }

  const availableOptions = date
    ? [
        "Try a date within the next week",
        'Use "next [day]" for upcoming weeks',
        "Check the full forecast view for available dates",
      ]
    : ["Check the location coordinates", "Try refreshing the data", "Contact support if the issue persists"];

  const optionsList = availableOptions.map((option) => `- ${option}`).join("\n");

  return `${title}

${description}

**Available options:**
${optionsList}`;
}

/**
 * Generate "Data Fetch Failed" error message
 * Used when API calls fail or network errors occur
 */
export function generateDataFetchFailedMessage(options: ErrorMessageOptions = {}): string {
  const { locationName, errorDetails } = options;

  const title = "## ⚠️ Data Fetch Failed";
  let description = "Unable to retrieve weather forecast data from the MET API.";

  if (locationName) {
    description = `Unable to retrieve weather forecast data for ${locationName} from the MET API.`;
  }

  const availableOptions = [
    "Check your internet connection",
    "Try again later",
    "Verify the location coordinates are correct",
  ];

  const optionsList = availableOptions.map((option) => `- ${option}`).join("\n");

  let message = `${title}

${description}

**Available options:**
${optionsList}`;

  if (errorDetails) {
    message += `\n\n**Error details:**\n${errorDetails}`;
  }

  return message;
}

/**
 * Generate "Search Failed" error message
 * Used when location search API calls fail
 */
export function generateSearchFailedMessage(errorDetails?: string): string {
  const message = `## ⚠️ Search Failed

Unable to search for locations. Please try again.

**Available options:**
- Check your internet connection
- Try a different search term
- Try again later`;

  if (errorDetails) {
    return `${message}\n\n**Error details:**\n${errorDetails}`;
  }

  return message;
}

/**
 * Generate "No Search Results" message
 * Used when location search returns no results
 */
export function generateNoSearchResultsMessage(searchTerm: string): string {
  return `## 🔍 No Search Results

No locations found matching "${searchTerm}".

**Available options:**
- Try a different search term
- Use more general location names
- Check spelling and formatting`;
}
