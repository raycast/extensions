import { open } from "@raycast/api";

// 平台配置对象
export const PLATFORMS = {
  x: { code: 'x' as const, name: 'x' as const },
  v: { code: 'v' as const, name: 'v2ex' as const },
  h: { code: 'h' as const, name: 'hackernews' as const },
  r: { code: 'r' as const, name: 'reddit' as const },
  m: { code: 'm' as const, name: 'medium' as const },
  z: { code: 'z' as const, name: 'zhihu' as const },
  b: { code: 'b' as const, name: 'bilibili' as const },
  y: { code: 'y' as const, name: 'youtube' as const },
} as const;

// 从配置对象派生类型
export type PlatformCode = (typeof PLATFORMS)[keyof typeof PLATFORMS]['code'];
export type Platform = (typeof PLATFORMS)[keyof typeof PLATFORMS]['name'];

// 从配置对象派生映射
export const platformMap: Record<PlatformCode, Platform> = Object.fromEntries(
  Object.values(PLATFORMS).map(({ code, name }) => [code, name])
) as Record<PlatformCode, Platform>;

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
 * 在指定平台上搜索关键词
 * @param platform 平台
 * @param keyword 关键词
 * @param date 日期（可选）
 */
export async function searchOnPlatform(platform: Platform, keyword: string, date?: string) {
  try {
    await openUrl(getSearchUrl(platform, keyword, date));
  } catch (error) {
    console.error(`Error searching on ${platform}:`, error);
  }
} 