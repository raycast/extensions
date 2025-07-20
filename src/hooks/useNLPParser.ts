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

    // Parse deadline patterns first ({date expression})
    const deadlineMatch = content.match(/\{([^}]+)\}/);
    if (deadlineMatch) {
      deadlineString = deadlineMatch[1];
      
      // Parse the deadline using chrono with enhanced configuration
      const deadlineResults = chrono.casual.parse(deadlineString, new Date(), { forwardDate: true });
      if (deadlineResults.length > 0) {
        parsedDeadline = deadlineResults[0].start.date();
      }
    }

    // Parse labels (@label) - extract all labels
    const labelMatches = content.match(/@(\w+)/g);
    if (labelMatches) {
      labels = labelMatches.map(match => match.replace('@', ''));
    }

    // Parse priority patterns (p1, p2, p3, p4)
    const priorityMatch = content.match(/\bp([1-4])\b/i);
    if (priorityMatch) {
      const priorityNumber = parseInt(priorityMatch[1], 10);

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

    // Parse project patterns (#ProjectName)
    const projectMatch = content.match(/#([a-zA-Z0-9_\u00A0-\uFFFF]+)/);
    if (projectMatch && projects) {
      const userProjectName = projectMatch[1];

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
    // We parse from the original content to find dates
    const customChrono = chrono.casual.clone();
    
    // Parse dates with enhanced options for better coverage
    const dateResults = customChrono.parse(content, new Date(), { 
      forwardDate: true  // Prefer future dates when ambiguous (like Todoist does)
    });
    
    if (dateResults.length > 0) {
      // Find the best date match (longest, most specific)
      let bestMatch = dateResults[0];
      for (const result of dateResults) {
        if (result.text.length > bestMatch.text.length) {
          bestMatch = result;
        }
      }
      
      dateString = bestMatch.text;
      parsedDate = bestMatch.start.date();
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
