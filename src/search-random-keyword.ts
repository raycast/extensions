import { showHUD, getPreferenceValues } from "@raycast/api";
import { getRandomElement } from "./lib/utils";
import { searchOnPlatform, PLATFORMS, Platform } from "./lib/platform-searcher";
import { readKeywords, KEYWORDS_FILE_PATH } from "./lib/keywords-manager";

interface Preferences {
  defaultPlatform1: Platform;
  defaultPlatform2: Platform | "";
  randomPlatform: boolean;
}

function getRandomAvailablePlatform(usedPlatforms: Platform[]): Platform {
  const availablePlatforms = PLATFORMS.filter(p => !usedPlatforms.includes(p)) as Platform[];
  return getRandomElement(availablePlatforms);
}

export default async function Command() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const keywords = await readKeywords(KEYWORDS_FILE_PATH);
    const randomKeyword = getRandomElement(keywords);

    // 计算日期
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const dateString = twoMonthsAgo.toISOString().split("T")[0];

    const selectedPlatforms = [preferences.defaultPlatform1];
    if (preferences.defaultPlatform2) {
      selectedPlatforms.push(preferences.defaultPlatform2);
    }

    for (const platform of selectedPlatforms) {
      await searchOnPlatform(platform, randomKeyword, dateString);
    }

    if (preferences.randomPlatform) {
      const randomPlatform = getRandomAvailablePlatform(selectedPlatforms);
      await searchOnPlatform(randomPlatform, randomKeyword, dateString);
    }

    await showHUD(`✅ Search random keyword: '${randomKeyword}'`, { clearRootSearch: true });
  } catch (error) {
    await showHUD("❌ Open random search failed");
  }
}
