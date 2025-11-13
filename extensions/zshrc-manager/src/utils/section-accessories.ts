/**
 * Utility functions for generating section accessories in list views
 *
 * Centralizes the logic for creating accessory items that display
 * section statistics (alias counts, export counts, etc.)
 */

import { Icon, List } from "@raycast/api";
import { LogicalSection } from "../lib/parse-zshrc";
import { MODERN_COLORS } from "../constants";

/**
 * Generate accessories array for a section based on its content counts
 *
 * @param section The logical section to generate accessories for
 * @returns Array of accessory objects for display in List.Item
 */
export function generateSectionAccessories(section: LogicalSection): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (section.aliasCount > 0) {
    accessories.push({
      icon: {
        source: Icon.Terminal,
        tintColor: MODERN_COLORS.success,
      },
      text: `${section.aliasCount}`,
    });
  }

  if (section.exportCount > 0) {
    accessories.push(
      {
        icon: {
          source: Icon.Box,
          tintColor: MODERN_COLORS.primary,
        },
      },
      { text: `${section.exportCount}` },
    );
  }

  if (section.functionCount > 0) {
    accessories.push(
      {
        icon: {
          source: Icon.Code,
          tintColor: MODERN_COLORS.primary,
        },
      },
      { text: `${section.functionCount}` },
    );
  }

  if (section.pluginCount > 0) {
    accessories.push(
      {
        icon: {
          source: Icon.Box,
          tintColor: MODERN_COLORS.warning,
        },
      },
      { text: `${section.pluginCount}` },
    );
  }

  return accessories;
}

/**
 * Calculate total number of entries in a section
 *
 * @param section The logical section to calculate entries for
 * @returns Total count of all entry types
 */
export function calculateTotalEntries(section: LogicalSection): number {
  return (
    section.aliasCount +
    section.exportCount +
    section.functionCount +
    section.pluginCount +
    section.sourceCount +
    section.evalCount +
    section.setoptCount +
    section.autoloadCount +
    section.fpathCount +
    section.pathCount +
    section.themeCount +
    section.completionCount +
    section.historyCount +
    section.keybindingCount +
    section.otherCount
  );
}
