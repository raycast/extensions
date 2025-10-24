/**
 * Statistics calculation utilities for zshrc content
 *
 * Provides functions to calculate and aggregate statistics
 * across logical sections and entry types.
 */

import { LogicalSection } from "../lib/parse-zshrc";
import {
  parseAliases,
  parseExports,
  parseEvals,
  parseSetopts,
  parsePlugins,
  parseFunctions,
  parseSources,
} from "./parsers";

/**
 * Aggregated statistics for all entry types
 */
export interface ZshrcStatistics {
  /** Total number of sections */
  sectionCount: number;
  /** All aliases across sections */
  aliases: ReturnType<typeof parseAliases>;
  /** All exports across sections */
  exports: ReturnType<typeof parseExports>;
  /** All evals across sections */
  evals: ReturnType<typeof parseEvals>;
  /** All setopts across sections */
  setopts: ReturnType<typeof parseSetopts>;
  /** All plugins across sections */
  plugins: ReturnType<typeof parsePlugins>;
  /** All functions across sections */
  functions: ReturnType<typeof parseFunctions>;
  /** All sources across sections */
  sources: ReturnType<typeof parseSources>;
}

/**
 * Calculates comprehensive statistics from logical sections
 *
 * Aggregates all parsed content types across all sections
 * and returns a unified statistics object.
 *
 * @param sections Array of logical sections from zshrc file
 * @returns Aggregated statistics object with counts and all entries
 *
 * @example
 * const sections = toLogicalSections(content);
 * const stats = calculateStatistics(sections);
 * console.log(`${stats.aliases.length} aliases found`);
 */
export function calculateStatistics(sections: LogicalSection[]): ZshrcStatistics {
  return {
    sectionCount: sections.length,
    aliases: sections.flatMap((section) => parseAliases(section.content)),
    exports: sections.flatMap((section) => parseExports(section.content)),
    evals: sections.flatMap((section) => parseEvals(section.content)),
    setopts: sections.flatMap((section) => parseSetopts(section.content)),
    plugins: sections.flatMap((section) => parsePlugins(section.content)),
    functions: sections.flatMap((section) => parseFunctions(section.content)),
    sources: sections.flatMap((section) => parseSources(section.content)),
  };
}

/**
 * Checks if any parsed entry type has content
 *
 * Useful for conditional rendering of statistics items.
 *
 * @param stats Statistics object from calculateStatistics()
 * @param type Type of entry to check ("aliases", "exports", "evals", etc.)
 * @returns True if the entry type has content
 *
 * @example
 * if (hasContent(stats, "aliases")) {
 *   return <List.Item title="Aliases" subtitle={`${stats.aliases.length} found`} />;
 * }
 */
export function hasContent(stats: ZshrcStatistics, type: keyof Omit<ZshrcStatistics, "sectionCount">): boolean {
  return (stats[type] as unknown[]).length > 0;
}

/**
 * Gets total count of all entries across all types
 *
 * @param stats Statistics object from calculateStatistics()
 * @returns Total number of entries (aliases + exports + evals + etc.)
 *
 * @example
 * const total = getTotalEntryCount(stats);
 * console.log(`Total configuration entries: ${total}`);
 */
export function getTotalEntryCount(stats: ZshrcStatistics): number {
  return (
    stats.aliases.length +
    stats.exports.length +
    stats.evals.length +
    stats.setopts.length +
    stats.plugins.length +
    stats.functions.length +
    stats.sources.length
  );
}

/**
 * Gets top entries by count for display in statistics
 *
 * @param entries Array of entries to take from
 * @param count Number of entries to return (default: 10)
 * @returns First N entries from the array
 *
 * @example
 * const topAliases = getTopEntries(stats.aliases, 5);
 */
export function getTopEntries<T>(entries: readonly T[], count: number = 10): T[] {
  return entries.slice(0, count);
}
