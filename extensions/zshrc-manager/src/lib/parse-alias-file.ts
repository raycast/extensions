/**
 * Parse Alias File Module
 *
 * Parses shell files (OMZ plugins, plain zsh) to extract alias definitions.
 * Framework-agnostic - works with any zsh alias format.
 */

export interface ParsedAlias {
  name: string;
  value: string;
  description?: string | undefined;
}

/**
 * Parse a shell file to extract alias definitions.
 * Handles various formats including OMZ plugin files and plain zsh.
 *
 * @param content The raw file content
 * @returns Array of parsed aliases
 */
export function parseAliasFile(content: string): ParsedAlias[] {
  const aliases: ParsedAlias[] = [];
  const lines = content.split("\n");

  let lastComment = "";

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine === undefined) continue;
    const line = rawLine.trim();

    // Track comments that might describe the next alias
    if (line.startsWith("#") && !line.startsWith("#!")) {
      // Remove leading # and whitespace
      lastComment = line.replace(/^#\s*/, "").trim();
      continue;
    }

    // Skip empty lines but don't reset comment
    if (!line) {
      continue;
    }

    // Parse alias definition
    // Formats:
    // - alias name='value'
    // - alias name="value"
    // - alias name=value
    // - alias -g name='value' (global alias)
    const aliasMatch = line.match(/^alias\s+(?:-[gsS]\s+)?([A-Za-z0-9_.-]+)=(.+)$/);

    if (aliasMatch && aliasMatch[1] && aliasMatch[2]) {
      const name = aliasMatch[1];
      let value = aliasMatch[2];

      // Remove surrounding quotes if present
      if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
        value = value.slice(1, -1);
      }

      aliases.push({
        name,
        value,
        description: lastComment || undefined,
      });

      // Reset comment after using it
      lastComment = "";
    } else {
      // Non-alias line resets the comment context
      lastComment = "";
    }
  }

  return aliases;
}

/**
 * Generate zshrc-ready content from a list of aliases.
 * Produces plain `alias foo='bar'` lines.
 *
 * @param name Collection name for the section header
 * @param aliases Array of aliases to format
 * @returns Formatted zsh content string
 */
export function generateAliasSection(name: string, aliases: ParsedAlias[]): string {
  const lines: string[] = [];

  // Add section header
  lines.push(`# --- ${name} ---`);
  lines.push("");

  for (const alias of aliases) {
    // Add description as comment if present
    if (alias.description) {
      lines.push(`# ${alias.description}`);
    }

    // Escape single quotes in the value
    const escapedValue = alias.value.replace(/'/g, "'\\''");
    lines.push(`alias ${alias.name}='${escapedValue}'`);
  }

  lines.push("");
  lines.push(`# --- End ${name} ---`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Extract the description/purpose from a plugin file header.
 *
 * @param content The raw file content
 * @returns Description string or undefined
 */
export function extractDescription(content: string): string | undefined {
  const lines = content.split("\n").slice(0, 20); // Check first 20 lines

  for (const line of lines) {
    // Look for common description patterns
    // OMZ style: # Description: ...
    // Or just: # Some description text
    const descMatch = line.match(/^#\s*(?:Description|Desc):\s*(.+)$/i);
    if (descMatch && descMatch[1]) {
      return descMatch[1].trim();
    }
  }

  // If no explicit description, try to find the first meaningful comment
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("#") &&
      !trimmed.startsWith("#!") &&
      !trimmed.startsWith("# -") &&
      !trimmed.match(/^#\s*(?:Author|Maintainer|Version|License|Copyright)/i)
    ) {
      const comment = trimmed.replace(/^#\s*/, "").trim();
      if (comment.length > 10 && comment.length < 200) {
        return comment;
      }
    }
  }

  return undefined;
}
