import { showHUD } from "@raycast/api";
import { getSearchUrl, openUrl, randomSelect, Platform } from "./utils";
import { readKeywords, KEYWORDS_FILE_PATH } from "./keywords-manager";

async function searchOnPlatform(platform: Platform, keyword: string, date?: string) {
  try {
    await openUrl(getSearchUrl(platform, keyword, date));
  } catch (error) {
    console.error(`Error searching on ${platform}:`, error);
  }
}

export default async function main() {
  try {
    const keywords = readKeywords(KEYWORDS_FILE_PATH);
    const randomKeyword = randomSelect(keywords);

    // 计算两个月前的日期
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const dateString = twoMonthsAgo.toISOString().split('T')[0];

    // 在X和V2EX上搜索
    await searchOnPlatform('x', randomKeyword, dateString);
    await searchOnPlatform('v2ex', randomKeyword);

    // 从其他平台中随机选择一个
    const otherPlatforms: Platform[] = ['reddit', 'medium', 'hackernews', 'youtube', 'bilibili', 'zhihu'];
    const randomPlatform = randomSelect(otherPlatforms);
    await searchOnPlatform(randomPlatform, randomKeyword);

    await showHUD(`Searching for "${randomKeyword}" on multiple platforms`);

  } catch (error) {
    console.error('Error in main:', error);
    await showHUD('搜索时发生错误，请查看控制台日志');
  }
}
