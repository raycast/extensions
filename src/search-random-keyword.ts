import { showHUD, getPreferenceValues } from "@raycast/api";
import { searchOnPlatform, Platform, SEARCH_PLATFORMS } from "./lib/platformSearch";
import { readKeywords } from "./lib/keywordStorage";

interface Preferences {
  defaultPlatform1: Platform;
  defaultPlatform2: Platform | "";
  randomPlatform: boolean;
}

export default async function Command() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const keywords = await readKeywords();
    const randomKeyword = getRandomElement(keywords);

    // Calculate date
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const dateString = twoMonthsAgo.toISOString().split("T")[0];

    // Get default platforms
    const defaultPlatforms = [preferences.defaultPlatform1];
    if (preferences.defaultPlatform2) {
      defaultPlatforms.push(preferences.defaultPlatform2);
    }

    // Search on default platforms
    for (const platform of defaultPlatforms) {
      await searchOnPlatform(platform, randomKeyword, dateString);
    }

    if (preferences.randomPlatform) {
      const unusedPlatforms = SEARCH_PLATFORMS.filter((p) => !defaultPlatforms.includes(p)) as Platform[];
      const randomPlatform = getRandomElement(unusedPlatforms);
      await searchOnPlatform(randomPlatform, randomKeyword, dateString);
    }

    await showHUD(`✅ Search random keyword: ${randomKeyword}`, { clearRootSearch: true });
  } catch (error) {
    await showHUD("❌ Open random search failed");
  }
}


/**
 * Randomly select an element from array
 * @param array Input array
 * @returns Randomly selected element
 */
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}