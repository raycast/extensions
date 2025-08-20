import { searchAliases, parseAliases } from "../utils/alias-utils";

/**
 * Input parameters for searching aliases
 */
type Input = {
  /** The search query to find matching aliases. Searches both alias names and commands */
  query: string;
  /** Optional limit for the number of results to return */
  limit?: number;
};

/**
 * Search for aliases by name or command
 *
 * This tool searches through all aliases for matches in either the alias name
 * or the command. The search is case-insensitive and supports partial matches.
 *
 * @param input - The search query and optional result limit
 * @returns Response containing matching aliases and metadata
 */
export default function searchAliasesCommand(input: Input) {
  try {
    const { query, limit } = input;

    if (!query || query.trim() === "") {
      return {
        success: false,
        aliases: [],
        total: 0,
        query: query || "",
        message: "Search query is required",
      };
    }

    const trimmedQuery = query.trim();
    const allAliases = parseAliases();
    const allMatchingAliases = searchAliases(trimmedQuery, allAliases);

    // Apply limit if specified
    let matchingAliases = allMatchingAliases;
    if (limit && limit > 0) {
      matchingAliases = allMatchingAliases.slice(0, limit);
    }

    const message =
      allMatchingAliases.length === 0
        ? `No aliases found matching '${trimmedQuery}'`
        : `Found ${matchingAliases.length} alias${matchingAliases.length === 1 ? "" : "es"} matching '${trimmedQuery}'${limit && limit > 0 && allMatchingAliases.length > limit ? ` (showing first ${limit})` : ""}`;

    return {
      success: true,
      aliases: matchingAliases,
      total: matchingAliases.length,
      query: trimmedQuery,
      message,
    };
  } catch (error) {
    return {
      success: false,
      aliases: [],
      total: 0,
      query: input.query || "",
      message: `Failed to search aliases: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
