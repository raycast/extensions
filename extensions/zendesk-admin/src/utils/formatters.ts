/**
 * Utility functions for common formatting patterns
 */

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString();
};

/**
 * Format date in a more readable, compact format
 * Example: "Nov 24, 2015 at 2:44 PM"
 */
export const formatDateCompact = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Format date for display in metadata (date only)
 * Example: "Nov 24, 2015"
 */
export const formatDateOnly = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Format time for display in metadata (time only)
 * Example: "2:44 PM"
 */
export const formatTimeOnly = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Format relative time (e.g., "2 days ago", "3 hours ago")
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks !== 1 ? "s" : ""} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? "s" : ""} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears !== 1 ? "s" : ""} ago`;
};

/**
 * Smart date formatting that shows relative time for recent dates and absolute date for older ones
 */
export const formatSmartDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  // Show relative time for dates within the last 30 days
  if (diffInDays < 30) {
    return formatRelativeTime(dateString);
  }

  // Show compact format for dates within the last year
  if (diffInDays < 365) {
    return formatDateCompact(dateString);
  }

  // Show date only for older dates
  return formatDateOnly(dateString);
};

export const formatInstanceColor = (instanceColor?: string, fallbackColor = "Blue") => {
  return instanceColor || fallbackColor;
};

/**
 * Formats dynamic content by removing titles from markdown and detecting JSON/HTML
 * @param content The content to format
 * @returns Formatted content
 */
export function formatDynamicContent(content: string): string {
  // First, try to detect if this is valid JSON
  const trimmedContent = content.trim();

  // Check if content looks like JSON (starts with { or [ and ends with } or ])
  if (
    (trimmedContent.startsWith("{") && trimmedContent.endsWith("}")) ||
    (trimmedContent.startsWith("[") && trimmedContent.endsWith("]"))
  ) {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(trimmedContent);
      // If successful, format as JSON code block
      return `\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
    } catch {
      // If JSON parsing fails, continue with markdown processing
    }
  }

  // Check if content looks like HTML (contains HTML tags)
  if (trimmedContent.match(/<[^>]+>.*<\/[^>]+>|<[^>]+\/>/)) {
    try {
      // Basic HTML formatting - add proper indentation
      const formattedHtml = formatHtml(trimmedContent);
      return `\`\`\`html\n${formattedHtml}\n\`\`\``;
    } catch {
      // If HTML formatting fails, continue with markdown processing
    }
  }

  // Remove markdown titles (lines starting with #)
  const lines = content.split("\n");
  const filteredLines = lines.filter((line) => {
    const trimmedLine = line.trim();
    // Remove lines that are just markdown headers (starting with #)
    return !trimmedLine.match(/^#{1,6}\s+/);
  });

  return filteredLines.join("\n").trim();
}

/**
 * Basic HTML formatting function to add proper indentation
 * @param html The HTML string to format
 * @returns Formatted HTML string
 */
function formatHtml(html: string): string {
  // Remove extra whitespace and normalize line breaks
  let formatted = html.replace(/\s+/g, " ").trim();

  // Add line breaks after closing tags for better readability
  formatted = formatted.replace(/>\s*</g, ">\n<");

  // Add indentation
  const lines = formatted.split("\n");
  let indentLevel = 0;
  const indentSize = 2;

  const formattedLines = lines.map((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return "";

    // Decrease indent for closing tags
    if (trimmedLine.startsWith("</")) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const indentedLine = " ".repeat(indentLevel * indentSize) + trimmedLine;

    // Increase indent for opening tags (but not self-closing tags)
    if (trimmedLine.startsWith("<") && !trimmedLine.startsWith("</") && !trimmedLine.endsWith("/>")) {
      indentLevel++;
    }

    return indentedLine;
  });

  return formattedLines.filter((line) => line !== "").join("\n");
}

/**
 * Constants for text truncation
 */
export const TRUNCATION_CONSTANTS = {
  /** Maximum length before truncating text (default) */
  MAX_LENGTH: 20,
  /** Shorter length for more compact displays */
  SHORT_LENGTH: 15,
  /** Character used to indicate truncated text */
  ELLIPSIS: "…",
} as const;

/**
 * Truncates a string to a specified maximum length, adding an ellipsis if truncated
 * @param str - The string to truncate
 * @param maxLength - Maximum length before truncation (defaults to TRUNCATION_CONSTANTS.MAX_LENGTH)
 * @returns The truncated string with ellipsis if needed
 */
export const truncateText = (str: string, maxLength: number = TRUNCATION_CONSTANTS.MAX_LENGTH): string => {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 1) + TRUNCATION_CONSTANTS.ELLIPSIS;
};
