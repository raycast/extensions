/**
 * Advanced section detection utilities
 *
 * Provides intelligent section detection with multiple formats,
 * priority-based matching, and context-aware parsing.
 */

import { PARSING_CONSTANTS } from "../constants";

import { SectionMarkerType } from "../types/enums";

/**
 * Represents a detected section marker
 */
export interface SectionMarker {
  /** Type of section marker */
  readonly type: SectionMarkerType;
  /** Detected section name */
  readonly name: string;
  /** Line number where marker was found */
  readonly lineNumber: number;
  /** Original line content */
  readonly originalLine: string;
  /** Priority for this marker type */
  readonly priority: number;
}

/**
 * Context for section detection
 */
export interface SectionContext {
  /** Currently active section name */
  currentSection: string | undefined;
  /** Stack of nested sections */
  sectionStack: string[];
  /** Function nesting level */
  functionLevel: number;
}

/**
 * Detects section markers in a line of zshrc content
 *
 * @param line The line to analyze
 * @param lineNumber Line number for context
 * @param context Current section context
 * @returns Detected section marker or null
 */
export function detectSectionMarker(line: string, lineNumber: number): SectionMarker | null {
  const trimmedLine = line.trim();

  // Test all section formats in priority order
  const formats = [
    {
      type: SectionMarkerType.CUSTOM_START,
      regex: PARSING_CONSTANTS.SECTION_FORMATS.CUSTOM_START,
    },
    {
      type: SectionMarkerType.CUSTOM_END,
      regex: PARSING_CONSTANTS.SECTION_FORMATS.CUSTOM_END,
    },
    {
      type: SectionMarkerType.DASHED_END,
      regex: PARSING_CONSTANTS.SECTION_FORMATS.DASHED_END,
    },
    {
      type: SectionMarkerType.DASHED_START,
      regex: PARSING_CONSTANTS.SECTION_FORMATS.DASHED_START,
    },
    {
      type: SectionMarkerType.BRACKETED,
      regex: PARSING_CONSTANTS.SECTION_FORMATS.BRACKETED,
    },
    { type: SectionMarkerType.HASH, regex: PARSING_CONSTANTS.SECTION_FORMATS.HASH },
    {
      type: SectionMarkerType.FUNCTION_START,
      regex: PARSING_CONSTANTS.SECTION_FORMATS.FUNCTION_START,
    },
    {
      type: SectionMarkerType.FUNCTION_END,
      regex: PARSING_CONSTANTS.SECTION_FORMATS.FUNCTION_END,
    },
    {
      type: SectionMarkerType.LABELED,
      regex: PARSING_CONSTANTS.SECTION_FORMATS.LABELED,
    },
  ];

  for (const format of formats) {
    const match = trimmedLine.match(format.regex);
    if (match) {
      const name = match[1]?.trim() || "";
      const priority =
        PARSING_CONSTANTS.SECTION_PRIORITIES[
          format.type.toUpperCase() as keyof typeof PARSING_CONSTANTS.SECTION_PRIORITIES
        ] || 0;

      return {
        type: format.type,
        name,
        lineNumber,
        originalLine: line,
        priority,
      };
    }
  }

  return null;
}

/**
 * Updates section context based on detected marker
 *
 * @param marker Detected section marker
 * @param context Current section context
 * @returns Updated context
 */
export function updateSectionContext(marker: SectionMarker, context: SectionContext): SectionContext {
  const newContext = { ...context };

  switch (marker.type) {
    case "custom_start":
    case "dashed_start":
    case "bracketed":
    case "hash":
    case "labeled":
      newContext.currentSection = marker.name;
      newContext.sectionStack.push(marker.name);
      break;

    case "custom_end":
    case "dashed_end":
      // End current section
      newContext.sectionStack.pop();
      newContext.currentSection =
        newContext.sectionStack.length > 0 ? newContext.sectionStack[newContext.sectionStack.length - 1] : undefined;
      break;

    case "function_start":
      newContext.functionLevel++;
      // Functions can be treated as sections if they have descriptive names
      if (marker.name && isDescriptiveFunctionName(marker.name)) {
        newContext.currentSection = `Function: ${marker.name}`;
        newContext.sectionStack.push(`Function: ${marker.name}`);
      }
      break;

    case "function_end":
      newContext.functionLevel--;
      // If we're ending a function that was treated as a section
      if (newContext.functionLevel === 0 && newContext.currentSection?.startsWith("Function:")) {
        newContext.sectionStack.pop();
        newContext.currentSection =
          newContext.sectionStack.length > 0 ? newContext.sectionStack[newContext.sectionStack.length - 1] : undefined;
      }
      break;
  }

  return newContext;
}

/**
 * Checks if a function name is descriptive enough to be treated as a section
 *
 * @param functionName The function name to check
 * @returns True if the function should be treated as a section
 */
function isDescriptiveFunctionName(functionName: string): boolean {
  // Functions with descriptive names (not just single letters or common patterns)
  const descriptivePatterns = [
    /^[a-z]{3,}$/i, // At least 3 characters
    /^[a-z]+_[a-z]+$/i, // Snake case
    /^[a-z]+[A-Z][a-z]+$/i, // Camel case
    /^(setup|init|config|install|update|clean|build|deploy)/i, // Common descriptive prefixes
  ];

  return descriptivePatterns.some((pattern) => pattern.test(functionName));
}

/**
 * Analyzes zshrc content and returns section markers with context
 *
 * @param content The zshrc file content
 * @returns Array of detected section markers
 */
export function analyzeSectionMarkers(content: string): SectionMarker[] {
  const lines = content.split(/\r?\n/);
  const markers: SectionMarker[] = [];
  let context: SectionContext = {
    currentSection: undefined,
    sectionStack: [],
    functionLevel: 0,
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line) {
      const marker = detectSectionMarker(line, i + 1);

      if (marker) {
        markers.push(marker);
        context = updateSectionContext(marker, context);
      }
    }
  }

  return markers;
}

/**
 * Groups content into sections based on detected markers
 *
 * @param content The zshrc file content
 * @returns Array of logical sections
 */
export function groupContentIntoSections(content: string): Array<{
  name: string;
  startLine: number;
  endLine: number;
  content: string;
  type: SectionMarkerType;
}> {
  const lines = content.split(/\r?\n/);
  const sections: Array<{
    name: string;
    startLine: number;
    endLine: number;
    content: string;
    type: SectionMarkerType;
  }> = [];

  let currentSection: {
    name: string;
    startLine: number;
    type: SectionMarkerType;
  } | null = null;

  let context: SectionContext = {
    currentSection: undefined,
    sectionStack: [],
    functionLevel: 0,
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line) {
      const marker = detectSectionMarker(line, i + 1);

      if (marker) {
        // Close previous section if exists
        if (currentSection) {
          sections.push({
            ...currentSection,
            endLine: i,
            content: lines.slice(currentSection.startLine - 1, i).join("\n"),
          });
        }

        // Start new section if it's a start marker
        if (["custom_start", "dashed_start", "bracketed", "hash", "labeled", "function_start"].includes(marker.type)) {
          currentSection = {
            name: marker.name,
            startLine: i + 1,
            type: marker.type,
          };
        } else {
          currentSection = null;
        }

        context = updateSectionContext(marker, context);
      }
    }
  }

  // Close final section if exists
  if (currentSection) {
    sections.push({
      ...currentSection,
      endLine: lines.length,
      content: lines.slice(currentSection.startLine - 1).join("\n"),
    });
  }

  return sections;
}

/**
 * Provides suggestions for improving section organization
 *
 * @param content The zshrc file content
 * @returns Array of suggestions
 */
export function suggestSectionImprovements(content: string): Array<{
  lineNumber: number;
  suggestion: string;
  priority: "low" | "medium" | "high";
}> {
  const suggestions: Array<{
    lineNumber: number;
    suggestion: string;
    priority: "low" | "medium" | "high";
  }> = [];

  const markers = analyzeSectionMarkers(content);

  // Check for unlabeled sections
  let lastSectionEnd = 0;
  for (const marker of markers) {
    if (marker.lineNumber - lastSectionEnd > 10) {
      suggestions.push({
        lineNumber: lastSectionEnd + 1,
        suggestion: `Consider adding a section header for ${marker.lineNumber - lastSectionEnd} lines of unlabeled content`,
        priority: "medium",
      });
    }
    lastSectionEnd = marker.lineNumber;
  }

  // Check for inconsistent section formats
  const formatCounts = new Map<string, number>();
  markers.forEach((marker) => {
    formatCounts.set(marker.type, (formatCounts.get(marker.type) || 0) + 1);
  });

  if (formatCounts.size > 2) {
    suggestions.push({
      lineNumber: 1,
      suggestion: "Consider using consistent section formatting throughout the file",
      priority: "low",
    });
  }

  return suggestions;
}
