import { ZendeskDynamicContent } from "../api/zendesk";

export interface GroupedDynamicContentResult {
  type: "name" | "content" | "all";
  title: string;
  items: ZendeskDynamicContent[];
}

export interface GroupedDynamicContentResponse {
  groupedResults: GroupedDynamicContentResult[];
  hasGroups: boolean;
}

/**
 * Groups dynamic content results by match type (name vs content)
 * @param items - Array of dynamic content items to group
 * @param searchText - Search query to match against
 * @returns Grouped results with metadata
 */
export function groupDynamicContentResults(
  items: ZendeskDynamicContent[],
  searchText: string,
): GroupedDynamicContentResponse {
  if (!searchText.trim()) {
    return {
      groupedResults: [
        {
          type: "all",
          title: "All Dynamic Content",
          items: items,
        },
      ],
      hasGroups: false,
    };
  }

  const searchLower = searchText.toLowerCase();
  const nameMatches: ZendeskDynamicContent[] = [];
  const contentMatches: ZendeskDynamicContent[] = [];

  items.forEach((item) => {
    const nameMatch = item.name.toLowerCase().includes(searchLower);
    const contentMatch = item.variants.some((variant) => variant.content.toLowerCase().includes(searchLower));

    if (nameMatch || contentMatch) {
      if (nameMatch) {
        nameMatches.push(item);
      }
      if (contentMatch) {
        contentMatches.push(item);
      }
    }
  });

  // Create grouped results
  const groupedResults: GroupedDynamicContentResult[] = [];

  // Add name matches first (more important)
  if (nameMatches.length > 0) {
    groupedResults.push({
      type: "name",
      title: `Name`,
      items: nameMatches.sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  // Add content matches (excluding items already in name matches)
  const contentOnlyMatches = contentMatches.filter((item) => !nameMatches.some((nameItem) => nameItem.id === item.id));
  if (contentOnlyMatches.length > 0) {
    groupedResults.push({
      type: "content",
      title: `Content`,
      items: contentOnlyMatches.sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  return {
    groupedResults,
    hasGroups: groupedResults.length > 1 || (groupedResults.length === 1 && groupedResults[0].items.length > 1),
  };
}
