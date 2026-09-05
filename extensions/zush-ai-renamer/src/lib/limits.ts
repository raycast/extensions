/**
 * These mirror the limits the other Zush surfaces analyze under, so a file that
 * gets a suggestion elsewhere gets one here too, sampled down the same way.
 */
export const LIMITS = {
  /** Files accepted from one Finder selection. */
  maxFiles: 50,
  /** Concurrent generation requests. */
  maxParallelRequests: 3,
  /** Bytes read from a plain-text file before sampling stops. */
  maxTextRangeBytes: 64 * 1024,
  /** Characters of extracted text forwarded to the model. */
  maxTextCharacters: 20_000,
  /** Source size ceiling for an Office Open XML container. */
  maxOfficeSourceBytes: 50 * 1024 * 1024,
  /** Uncompressed ceiling, so a zip bomb cannot exhaust memory. */
  maxOfficeExpandedBytes: 24 * 1024 * 1024,
  /** Slides sampled from a presentation. */
  maxPresentationSlides: 12,
  /** Shared strings sampled from a workbook. */
  maxSpreadsheetStrings: 200,
  /** A PDF above this is reported as too large instead of being uploaded. */
  maxInlinePdfBytes: 4 * 1024 * 1024,
  /** An image above this is reported as too large instead of being uploaded. */
  maxImageSourceBytes: 8 * 1024 * 1024,
  /** Characters kept from a generated title. */
  maxTitleCharacters: 180,
  /** Bytes a macOS filename may occupy, including the extension. */
  maxFilenameBytes: 255,
  /** Milliseconds one generation request may take. */
  requestTimeoutMs: 60_000,
  /** Extra attempts, after the first, for a failure a retry might fix. */
  maxRetries: 2,
  /** First pause before such a retry. It doubles with each further attempt. */
  retryBackoffMs: 1_000,
  /**
   * The longest pause worth taking. A command someone is sitting in front of
   * cannot honour the multi-minute wait Google names when a quota is spent, so
   * a request for longer than this ends the retries rather than shortening them.
   */
  maxRetryDelayMs: 8_000,
} as const;
