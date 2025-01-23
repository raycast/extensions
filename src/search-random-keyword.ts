import { showHUD } from "@raycast/api";
import { getRandomElement } from "./lib/utils";
import { searchOnPlatform, DEFAULT_PLATFORMS, OPTIONAL_PLATFORMS } from "./lib/platform-searcher";
import { readKeywords, KEYWORDS_FILE_PATH } from "./lib/keywords-manager";

export default async function Command() {
  try {
    const keywords = await readKeywords(KEYWORDS_FILE_PATH);
    const randomKeyword = getRandomElement(keywords);

    // 计算两个月前的日期
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const dateString = twoMonthsAgo.toISOString().split("T")[0];

    // 在默认平台上搜索
    for (const platform of DEFAULT_PLATFORMS) {
      await searchOnPlatform(platform, randomKeyword, dateString);
    }

    // 随机选择一个其他平台搜索
    const randomPlatform = getRandomElement(OPTIONAL_PLATFORMS);
    await searchOnPlatform(randomPlatform, randomKeyword, dateString);
  } catch (error) {
    await showHUD("❌ Cannot open random search!");
  }
}
