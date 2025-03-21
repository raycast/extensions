import { open, getPreferenceValues } from "@raycast/api";

// All supported platforms
export const SEARCH_PLATFORMS = ["x", "v2ex", "hackernews", "reddit", "medium", "zhihu", "bilibili", "youtube"] as const;
export type Platform = (typeof SEARCH_PLATFORMS)[number];


// Get user language setting
function getLanguageFilter(): string {
  const preferences = getPreferenceValues();
  const userLanguage = preferences.language as string;
  return userLanguage ? `lang:${userLanguage}` : "";
}

/**
 * Get search URL
 * @param platform Platform name
 * @param keyword Search keyword
 * @param date Date (only used for X platform)
 * @returns Search URL
 */
function getSearchUrl(platform: Platform, keyword: string, date?: string): string {
  const encodedKeyword = encodeURIComponent(keyword);

  switch (platform) {
    case "x": {
      const langFilter = getLanguageFilter();
      const langParam = langFilter ? `+${langFilter}` : "";
      return `https://x.com/search?q=${encodedKeyword}+min_replies:1+min_retweets:1${langParam}+since:${date}&src=typed_query&f=live`;
    }
    case "v2ex":
      return `https://google.com/search?q=${encodedKeyword}+site:v2ex.com&newwindow=1&tbs=qdr:m`;
    case "reddit":
      return `https://reddit.com/search?q=${encodedKeyword}&t=month`;
    case "medium":
      return `https://medium.com/search?q=${encodedKeyword}`;
    case "hackernews":
      return `https://hn.algolia.com/?q=${encodedKeyword}&dateRange=pastMonth&type=story`;
    case "youtube":
      return `https://www.youtube.com/results?search_query=${encodedKeyword}`;
    case "bilibili":
      return `https://search.bilibili.com/all?keyword=${encodedKeyword}&from_source=webtop_search`;
    case "zhihu":
      return `https://www.zhihu.com/search?q=${encodedKeyword}`;
  }
}

/**
 * Open URL
 * @param url URL to open
 * @returns Promise
 */
async function openUrl(url: string): Promise<void> {
  await open(url);
}

/**
 * Search keyword on specified platform
 * @param platform Platform name
 * @param keyword Search keyword
 * @param date Date (optional)
 */
export async function searchOnPlatform(platform: Platform, keyword: string, date?: string) {
  try {
    await openUrl(getSearchUrl(platform, keyword, date));
  } catch (error) {
    console.error(`Error searching on ${platform}:`, error);
  }
}
