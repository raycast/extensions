import { useMemo } from "react";
import * as chrono from "chrono-node";

import { Project } from "../api";

export type ParsedData = {
  cleanedTitle: string;
  priority?: number;
  projectId?: string;
  dateString?: string;
  deadlineString?: string;
  parsedDate?: Date;
  parsedDeadline?: Date;
  labels?: string[];
};

/**
 * Hook for real-time NLP parsing of task content
 * Parses priority patterns (p1-p4), project names (#project), 
 * labels (@label), dates (natural language), and deadlines ({date})
 * 
 * NOTE: This hook does NOT modify the original content - it only extracts
 * information to populate other form fields. The title remains unchanged.
 * 
 * Uses chrono-node for date parsing, which supports the same patterns as Todoist:
 * - Simple dates: "tomorrow", "next monday", "march 15"
 * - Times: "tomorrow at 3pm", "monday at 12:30"
 * - Relative: "in 3 days", "in 2 weeks"
 * - Complex: "next friday at 2pm", "monday morning"
 */
export function useNLPParser(content: string, projects?: Project[]): ParsedData {
  return useMemo(() => {
    if (!content) {
      return { cleanedTitle: content };
    }

    // We keep the original content unchanged for the title field
    let cleanedTitle = content;
    let priority: number | undefined;
    let projectId: string | undefined;
    let dateString: string | undefined;
    let deadlineString: string | undefined;
    let parsedDate: Date | undefined;
    let parsedDeadline: Date | undefined;
    let labels: string[] = [];

    // Parse deadline patterns - use the LAST occurrence ({date expression})
    const deadlineMatches = Array.from(content.matchAll(/\{([^}]+)\}/g));
    if (deadlineMatches.length > 0) {
      // Use the last deadline pattern found
      const lastDeadlineMatch = deadlineMatches[deadlineMatches.length - 1];
      deadlineString = lastDeadlineMatch[1];
      
      // Parse the deadline using chrono with enhanced configuration
      const deadlineResults = chrono.casual.parse(deadlineString, new Date(), { forwardDate: true });
      if (deadlineResults.length > 0) {
        parsedDeadline = deadlineResults[0].start.date();
      }
    }

    // Parse labels (@label) - extract all labels, keeping the most recent of each unique label
    const labelMatches = Array.from(content.matchAll(/@(\w+)/g));
    if (labelMatches.length > 0) {
      // Get all labels but remove duplicates, keeping the last occurrence of each
      const allLabels = labelMatches.map(match => match[1]);
      labels = [...new Set(allLabels.reverse())].reverse(); // Remove duplicates, keeping last occurrence
    }

    // Parse priority patterns - use the LAST occurrence (p1, p2, p3, p4)
    const priorityMatches = Array.from(content.matchAll(/\bp([1-4])\b/gi));
    if (priorityMatches.length > 0) {
      // Use the last priority pattern found
      const lastPriorityMatch = priorityMatches[priorityMatches.length - 1];
      const priorityNumber = parseInt(lastPriorityMatch[1], 10);

      // Convert user input to Todoist priority values
      // p1 (user) -> priority 4 (todoist), p4 (user) -> priority 1 (todoist)
      const priorityMap: Record<number, number> = {
        1: 4, // p1 -> highest priority (4)
        2: 3, // p2 -> high priority (3)
        3: 2, // p3 -> medium priority (2)
        4: 1, // p4 -> lowest priority (1)
      };

      priority = priorityMap[priorityNumber];
    }

    // Parse project patterns - use the LAST occurrence (#ProjectName)
    const projectMatches = Array.from(content.matchAll(/#([a-zA-Z0-9_\u00A0-\uFFFF]+)/g));
    if (projectMatches.length > 0 && projects) {
      // Use the last project pattern found
      const lastProjectMatch = projectMatches[projectMatches.length - 1];
      const userProjectName = lastProjectMatch[1];

      // Find matching project with case-insensitive and emoji-stripped comparison
      const matchingProject = projects.find((project) => {
        const normalizedProjectName = normalizeProjectName(project.name);
        const normalizedUserInput = normalizeProjectName(userProjectName);
        return normalizedProjectName === normalizedUserInput;
      });

      if (matchingProject) {
        projectId = matchingProject.id;
      }
    }

    // Enhanced natural language date parsing using chrono-node
    // We parse from the original content to find dates - use the LAST/MOST RECENT date found
    // BUT exclude any dates that are inside curly braces (deadline patterns)
    const customChrono = chrono.casual.clone();
    
    // Create a version of content with deadline patterns removed to avoid conflicts
    let contentForDateParsing = content;
    
    // Remove complete deadline patterns {date} from date parsing
    contentForDateParsing = contentForDateParsing.replace(/\{[^}]+\}/g, '');
    
    // Also remove incomplete deadline patterns {partial to avoid parsing dates inside them
    contentForDateParsing = contentForDateParsing.replace(/\{[^}]*$/g, '');
    
    // Parse dates with enhanced options for better coverage
    const dateResults = customChrono.parse(contentForDateParsing, new Date(), { 
      forwardDate: true  // Prefer future dates when ambiguous (like Todoist does)
    });
    
    if (dateResults.length > 0) {
      // Use the LAST date found (most recent in the text)
      const lastDateResult = dateResults[dateResults.length - 1];
      
      dateString = lastDateResult.text;
      parsedDate = lastDateResult.start.date();
    }

    // Return the original content as cleanedTitle (no cleaning applied)
    return {
      cleanedTitle: content, // Keep original content unchanged
      priority,
      projectId,
      dateString,
      deadlineString,
      parsedDate,
      parsedDeadline,
      labels,
    };
  }, [content, projects]);
}

/**
 * Normalizes project name by converting to lowercase and removing emojis
 */
function normalizeProjectName(name: string): string {
  // Remove emojis using regex that matches most emoji ranges
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

  return name
    .replace(emojiRegex, "") // Remove emojis
    .toLowerCase() // Convert to lowercase
    .trim(); // Remove leading/trailing whitespace
}
