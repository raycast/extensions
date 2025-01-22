
import { open } from "@raycast/api";

export type Platform = 'x' | 'v2ex' | 'reddit' | 'medium' | 'hackernews' | 'youtube' | 'bilibili' | 'zhihu';

/**
 * 获取搜索URL
 * @param platform 平台名称
 * @param keyword 搜索关键词
 * @param date 日期（仅用于X平台）
 * @returns 搜索URL
 */
export function getSearchUrl(platform: Platform, keyword: string, date?: string): string {
  const encodedKeyword = encodeURIComponent(keyword);

  switch (platform) {
    case 'x':
      return `https://x.com/search?q=${encodedKeyword}+min_replies:2+min_retweets:1+lang:zh-cn+since:${date}&src=typed_query&f=live`;
    case 'v2ex':
      return `https://google.com/search?q=${encodedKeyword}+site:v2ex.com&newwindow=1&tbs=qdr:m`;
    case 'reddit':
      return `https://reddit.com/search?q=${encodedKeyword}&t=month`;
    case 'medium':
      return `https://medium.com/search?q=${encodedKeyword}`;
    case 'hackernews':
      return `https://google.com/search?q=${encodedKeyword}+site:news.ycombinator.com&newwindow=1&tbs=qdr:m`;
    case 'youtube':
      return `https://www.youtube.com/results?search_query=${encodedKeyword}`;
    case 'bilibili':
      return `https://search.bilibili.com/all?keyword=${encodedKeyword}&from_source=webtop_search`;
    case 'zhihu':
      return `https://www.zhihu.com/search?q=${encodedKeyword}`;
  }
}

/**
 * 打开URL
 * @param url 要打开的URL
 * @returns Promise
 */
export async function openUrl(url: string): Promise<void> {
  await open(url);
}

/**
 * 从数组中随机选择一个元素
 * @param array 输入数组
 * @returns 随机选中的元素
 */
export function randomSelect<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
} 