import { showHUD, LaunchProps } from "@raycast/api";
import { getRandomElement } from "./lib/utils";
import { Platform, searchOnPlatform } from "./lib/platform-searcher";
import { readKeywords, KEYWORDS_FILE_PATH } from "./lib/keywords-manager";

export default async function Command(props: LaunchProps) {
  try {
    const keywords = await readKeywords(KEYWORDS_FILE_PATH);
    const randomKeyword = getRandomElement(keywords);

    // 计算两个月前的日期
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const dateString = twoMonthsAgo.toISOString().split('T')[0];

    // 在X和V2EX上搜索
    await searchOnPlatform('x', randomKeyword, dateString);
    await searchOnPlatform('v2ex', randomKeyword);

    // 从其他平台中随机选择一个
    const otherPlatforms: Platform[] = ['reddit', 'medium', 'hackernews', 'youtube', 'bilibili', 'zhihu'];
    const randomPlatform = getRandomElement(otherPlatforms);
    await searchOnPlatform(randomPlatform, randomKeyword);

    await showHUD(`Searching for "${randomKeyword}" on multiple platforms`);

  } catch (error) {
    console.error('Error in Command:', error);
    await showHUD('搜索时发生错误，请查看控制台日志');
  }
}
