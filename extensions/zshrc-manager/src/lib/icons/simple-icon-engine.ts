import * as SimpleIcons from "simple-icons";

/**
 * Helper function to get Simple Icon data
 */
export function getSimpleIcon(name: string): { svg: string; hex: string; title?: string; slug?: string } | null {
  try {
    // Convert name to Simple Icons property format (e.g., "python" -> "siPython")
    const propertyName = `si${name.charAt(0).toUpperCase()}${name.slice(1)}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const icon = (SimpleIcons as any)[propertyName];

    if (icon && icon.svg && icon.hex) {
      return {
        svg: icon.svg,
        hex: icon.hex,
        title: icon.title,
        slug: icon.slug,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts words from a section name for matching
 * Splits on spaces, hyphens, underscores, and other separators
 *
 * @param sectionName The section name to extract words from
 * @returns Array of lowercase words
 */
function extractWords(sectionName: string): string[] {
  return sectionName
    .toLowerCase()
    .split(/[\s\-_.,;:!?()[\]{}|/\\]+/)
    .filter((word) => word.length >= 2);
}

/**
 * Finds the best matching Simple Icon for a section name
 *
 * Uses exact word-by-word matching:
 * 1. Try the full normalized name
 * 2. Split section name into words and try each word
 * 3. First exact match wins
 *
 * This approach avoids false positives from fuzzy matching
 * (e.g., "config" incorrectly matching "EditorConfig")
 *
 * @param sectionName The original section name
 * @param normalizedName Pre-normalized section name
 * @returns Object with icon name and icon data, or null if no match found
 */
export function findBestSimpleIcon(
  sectionName: string,
  normalizedName: string,
): { name: string; icon: { svg: string; hex: string } } | null {
  // Return null for empty normalized names
  if (!normalizedName) {
    return null;
  }

  // Try the full normalized name first (handles pre-normalized synonyms like k8s → kubernetes)
  const directMatch = getSimpleIcon(normalizedName);
  if (directMatch) {
    return { name: normalizedName, icon: directMatch };
  }

  // Extract words from the original section name and try each one
  // e.g., "Docker Completions" → ["docker", "completions"] → try "docker" first
  const words = extractWords(sectionName);

  for (const word of words) {
    const match = getSimpleIcon(word);
    if (match) {
      return { name: word, icon: match };
    }
  }

  return null;
}

/**
 * Converts SVG string to data URL for Raycast compatibility
 */
export function svgToDataUrl(svg: string): string {
  // Clean up the SVG string
  const cleanSvg = svg.trim();

  // Use base64 encoding for better compatibility with special characters
  try {
    // Prefer browser btoa if available, otherwise use Node Buffer
    const base64 =
      typeof btoa !== "undefined"
        ? btoa(unescape(encodeURIComponent(cleanSvg)))
        : Buffer.from(cleanSvg, "utf8").toString("base64");
    return `data:image/svg+xml;base64,${base64}`;
  } catch {
    // Fallback to URL encoding if base64 fails
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanSvg)}`;
  }
}

/**
 * Gets a list of all available Simple Icons for reference
 * @returns Array of available Simple Icon names
 */
export function getAvailableSectionIcons(): string[] {
  return Object.keys(SimpleIcons)
    .filter((key) => key.startsWith("si"))
    .map((key) => key.substring(2).toLowerCase()) // Remove 'si' prefix
    .sort();
}
