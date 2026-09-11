import { Icon } from "@raycast/api";
import { MODERN_COLORS } from "../../constants";
import { getSynonyms } from "./synonym-cache";

/**
 * Normalizes section names for better matching with Simple Icons.
 * Uses synonyms from the manifest (cached) to map common variants.
 */
export function normalizeSectionName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Replace & with "and" before processing
  normalized = normalized.replace(/&/g, "and");

  // Apply synonyms from manifest cache
  const synonyms = getSynonyms();
  for (const [synonym, canonical] of Object.entries(synonyms)) {
    const escaped = synonym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    normalized = normalized.replace(regex, canonical);
  }

  normalized = normalized
    // Remove punctuation and special characters (keep alphanumerics only)
    .replace(/[!@#$%^&*()_+=[\]{}|;':",./<>?~`-]/g, "")
    // Remove whitespace
    .replace(/\s+/g, "");

  // Remove generic labels if the whole value is one of them
  if (/^(section|config|setup|init|start|end)$/.test(normalized)) {
    return "";
  }

  return normalized;
}

/**
 * Determines semantic category for fallback icons.
 * Always returns null to allow Simple Icons lookup for all section names.
 * Previously used a hardcoded list, now defers to dynamic icon lookup.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getSemanticCategory(sectionName: string): {
  icon: Icon;
  color: string;
} | null {
  // Always return null to let Simple Icons handle all lookups
  return null;
}

/**
 * Gets fallback icon for sections that don't match Simple Icons.
 * This is only used when getSemanticCategory returns null and
 * Simple Icons fuzzy matching also fails.
 */
export function getFallbackIcon(): { icon: Icon; color: string } {
  return { icon: Icon.Folder, color: MODERN_COLORS.neutral };
}
