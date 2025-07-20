import { useMemo } from "react";

import { Project } from "../api";

export type ParsedData = {
  cleanedTitle: string;
  priority?: number;
  projectId?: string;
};

/**
 * Hook for real-time NLP parsing of task content
 * Parses priority patterns (p1-p4) and project names (#project)
 */
export function useNLPParser(content: string, projects?: Project[]): ParsedData {
  return useMemo(() => {
    if (!content) {
      return { cleanedTitle: content };
    }

    let cleanedTitle = content;
    let priority: number | undefined;
    let projectId: string | undefined;

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

      // Remove priority pattern from title
      cleanedTitle = cleanedTitle.replace(/\bp[1-4]\b/i, "").trim();
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

        // Remove project pattern from title
        cleanedTitle = cleanedTitle.replace(/#[a-zA-Z0-9_\u00A0-\uFFFF]+/, "").trim();
      }
    }

    // Clean up multiple spaces and trim
    cleanedTitle = cleanedTitle.replace(/\s+/g, " ").trim();

    return {
      cleanedTitle,
      priority,
      projectId,
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
