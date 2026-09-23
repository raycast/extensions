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

import type { Image } from "@raycast/api";
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
    const hex = String(simpleIconMatch.icon.hex || "").toUpperCase();
    // Bake the brand color into the SVG before encoding: simple-icons ship
    // black paths, and relying on tintColor leaves the icon invisible if
    // tinting fails
    return {
      icon: svgToDataUrl(simpleIconMatch.icon.svg, hex),
      color: hex,
    };
  }

  // Step 3: Fall back to default icon
  return getFallbackIcon();
}

/**
 * Gets a ready-to-render image for a section name.
 *
 * Simple Icons arrive as data-URL SVGs with their brand color baked into the
 * fill, and must NOT be tinted: current Raycast builds render a tinted
 * data-URL SVG as nothing at all. Raycast built-in icons still need the
 * tint to get their color.
 */
export function getSectionImage(sectionName: string): Image.ImageLike {
  const { icon, color } = getSectionIcon(sectionName);
  if (typeof icon === "string" && icon.startsWith("data:")) {
    return { source: icon };
  }
  return { source: icon, tintColor: color };
}
