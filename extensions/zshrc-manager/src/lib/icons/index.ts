/**
 * Section Icons Module
 *
 * Dynamic icon lookup system based on section names.
 * Uses Simple Icons with fuzzy matching and semantic fallbacks.
 *
 * Flow:
 * 1. Check if it's a generic zsh concept (aliases, exports, etc.) → use Raycast icon
 * 2. Try Simple Icons fuzzy matching → use brand icon
 * 3. Fall back to default folder icon
 */

import { findBestSimpleIcon, svgToDataUrl } from "./simple-icon-engine";
import { normalizeSectionName, getSemanticCategory, getFallbackIcon } from "./section-normalizer";
import type { IconSource } from "./icon-types";

// Re-export types
export type { IconSource } from "./icon-types";

// Re-export utility function
export { getAvailableSectionIcons } from "./simple-icon-engine";

/**
 * Gets the appropriate icon and color for a section name using dynamic lookup
 * @param sectionName The name of the section
 * @returns Object with icon and color properties
 */
export function getSectionIcon(sectionName: string): {
  icon: IconSource;
  color: string;
} {
  // Normalize the section name for matching
  const normalized = normalizeSectionName(sectionName);

  // Step 1: Check if it's a generic zsh concept (should use Raycast icons)
  const semanticIcon = getSemanticCategory(sectionName);
  if (semanticIcon) {
    return semanticIcon;
  }

  // Step 2: Try to find a matching Simple Icon
  const simpleIconMatch = findBestSimpleIcon(sectionName, normalized);
  if (simpleIconMatch) {
    return {
      icon: svgToDataUrl(simpleIconMatch.icon.svg),
      color: String(simpleIconMatch.icon.hex || "").toUpperCase(),
    };
  }

  // Step 3: Fall back to default icon
  return getFallbackIcon();
}
