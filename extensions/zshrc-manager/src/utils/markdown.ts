/**
 * Markdown generation utilities for zshrc sections
 *
 * Provides functions to generate formatted markdown content
 * for different display modes and section types.
 */

import { LogicalSection } from "../lib/parse-zshrc";
import { parseAliases, parseExports } from "./parsers";
// import { truncateValueMiddle } from "./formatters";

/**
 * Represents parsed section content with aliases, exports, and other lines
 */
export interface ParsedSectionContent {
  /** Parsed aliases from section */
  aliases: ReturnType<typeof parseAliases>;
  /** Parsed exports from section */
  exports: ReturnType<typeof parseExports>;
  /** Other configuration lines */
  otherLines: string[];
}

/**
 * Extracts and parses all content types from a section
 *
 * @param section The logical section to parse
 * @returns Parsed content with aliases, exports, and other lines
 *
 * @example
 * const content = parseSectionContent(section);
 * console.log(`Found ${content.aliases.length} aliases`);
 */
export function parseSectionContent(
  section: LogicalSection,
): ParsedSectionContent {
  const aliases = parseAliases(section.content);
  const exports = parseExports(section.content);

  // Extract other content (non-alias, non-export lines)
  const lines = section.content.split("\n");
  const otherLines = lines.filter((line) => {
    const trimmed = line.trim();
    return (
      trimmed &&
      !trimmed.startsWith("#") &&
      !trimmed.match(/^(alias|export|typeset\s+-x)\s+/) &&
      !trimmed.match(/^\s*$/)
    );
  });

  return { aliases, exports, otherLines };
}

/**
 * Applies filter to parsed content based on filter type
 *
 * @param content Parsed section content
 * @param filterType Type of content to include ("all", "aliases", "exports")
 * @returns Filtered content matching the filter type
 *
 * @example
 * const filtered = applyContentFilter(content, "aliases");
 * console.log(filtered.aliases); // All aliases
 * console.log(filtered.exports); // Empty array
 */
export function applyContentFilter(
  content: ParsedSectionContent,
  filterType: "all" | "aliases" | "exports" = "all",
): ParsedSectionContent {
  return {
    aliases:
      filterType === "aliases" || filterType === "all" ? content.aliases : [],
    exports:
      filterType === "exports" || filterType === "all" ? content.exports : [],
    otherLines: filterType === "all" ? content.otherLines : [],
  };
}

/**
 * Generates markdown for raw section content display
 *
 * @param section The logical section
 * @returns Markdown string with raw content
 *
 * @example
 * const md = generateRawMarkdown(section);
 * return <Detail markdown={md} />;
 */
export function generateRawMarkdown(section: LogicalSection): string {
  return `
# ${section.label}

**Lines:** ${section.startLine}-${section.endLine}

---

## 📋 Raw Content

\`\`\`zsh
${section.content}
\`\`\`
  `;
}

/**
 * Generates markdown for compact section content display
 *
 * @param section The logical section
 * @param content Parsed and filtered section content
 * @returns Markdown string with compact content
 *
 * @example
 * const content = parseSectionContent(section);
 * const filtered = applyContentFilter(content, "aliases");
 * const md = generateCompactMarkdown(section, filtered);
 */
export function generateCompactMarkdown(
  section: LogicalSection,
  content: ParsedSectionContent,
): string {
  const hasAliases = content.aliases.length > 0;
  const hasExports = content.exports.length > 0;
  const hasOtherContent = content.otherLines.length > 0;

  return `
# ${section.label}

**Lines:** ${section.startLine}-${section.endLine} | **Aliases:** ${content.aliases.length} | **Exports:** ${content.exports.length}

---

${
  hasAliases
    ? `
## 🖥️ Aliases
${content.aliases.map((alias) => `\`${alias.name}\` → \`${alias.command}\``).join(" | ")}
`
    : ""
}

${
  hasExports
    ? `
## 📦 Exports
${content.exports.map((exp) => `\`${exp.variable}\` = \`${exp.value}\``).join(" | ")}
`
    : ""
}

${
  hasOtherContent
    ? `
## ⚙️ Other Configuration
\`\`\`zsh
${content.otherLines.join("\n")}
\`\`\`
`
    : ""
}
  `;
}

/**
 * Generates markdown for formatted section content display
 *
 * @param section The logical section
 * @param content Parsed and filtered section content
 * @returns Markdown string with formatted content
 *
 * @example
 * const content = parseSectionContent(section);
 * const md = generateFormattedMarkdown(section, content);
 */
export function generateFormattedMarkdown(
  section: LogicalSection,
  content: ParsedSectionContent,
): string {
  const hasAliases = content.aliases.length > 0;
  const hasExports = content.exports.length > 0;
  const hasOtherContent = content.otherLines.length > 0;

  return `
# ${section.label}

**Lines:** ${section.startLine}-${section.endLine} | **Aliases:** ${content.aliases.length} | **Exports:** ${content.exports.length}

---

${
  hasAliases
    ? `
## 🖥️ Aliases

${content.aliases.map((alias) => `- **\`${alias.name}\`** → \`${alias.command}\``).join("\n")}

---`
    : ""
}

${
  hasExports
    ? `
## 📦 Exports

${content.exports.map((exp) => `- **\`${exp.variable}\`** = \`${exp.value}\``).join("\n")}

---`
    : ""
}

${
  hasOtherContent
    ? `
## ⚙️ Other Configuration

\`\`\`zsh
${content.otherLines.join("\n")}
\`\`\`

---`
    : ""
}

## 📋 Raw Content

\`\`\`zsh
${section.content}
\`\`\`
  `;
}

/**
 * Generates appropriate markdown based on display mode
 *
 * Delegates to specific markdown generators based on the requested mode.
 *
 * @param section The logical section
 * @param displayMode Display mode: "raw", "compact", or "formatted"
 * @param content Optional pre-parsed content (will be parsed if not provided)
 * @returns Generated markdown string
 *
 * @example
 * const md = generateSectionMarkdown(section, "formatted");
 * return <Detail markdown={md} />;
 */
export function generateSectionMarkdown(
  section: LogicalSection,
  displayMode: "formatted" | "raw" | "compact" = "formatted",
  content?: ParsedSectionContent,
): string {
  const parsedContent = content || parseSectionContent(section);

  switch (displayMode) {
    case "raw":
      return generateRawMarkdown(section);
    case "compact":
      return generateCompactMarkdown(section, parsedContent);
    case "formatted":
    default:
      return generateFormattedMarkdown(section, parsedContent);
  }
}
