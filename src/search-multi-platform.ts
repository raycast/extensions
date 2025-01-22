import { getSearchUrl, openUrl, Platform } from './lib/platform-searcher';
import { subMonths, format } from 'date-fns';
import { LaunchProps, showHUD } from "@raycast/api";
import { isNotEmpty, readtext } from "./lib/utils";
import { randomSelect } from "./lib/utils";
type PlatformCode = 'x' | 'v' | 'h' | 'r' | 'm' | 'z' | 'b' | 'y';
type PlatformMap = {
  [K in PlatformCode]: Platform;
};

// 参数类型定义
type SearchArguments = {
  keyword?: string;
  platforms?: string;
};

const platformMap: PlatformMap = {
  x: 'x',
  v: 'v2ex',
  h: 'hackernews',
  r: 'reddit',
  m: 'medium',
  z: 'zhihu',
  b: 'bilibili',
  y: 'youtube'
};

/**
 * 在多个平台上搜索
 * @param keyword 搜索关键词
 * @param platformCodes 平台代码字符串 (例如: "xvh")
 */
async function searchMultiPlatform(keyword: string, platformCodes?: string): Promise<void> {
  // 如果未指定平台，随机选择一个平台与 x.com 和 v2ex 组合
  if (!platformCodes) {
    const randomPlatform = randomSelect(['h', 'r', 'm', 'z', 'b', 'y'] as PlatformCode[]);
    platformCodes = `xv${randomPlatform}`;
  }

  // 计算6个月前的日期
  const sixMonthsAgo = format(subMonths(new Date(), 6), 'yyyy-MM-dd');

  // 处理每个平台代码
  const promises = Array.from(platformCodes.toLowerCase()).map(async (code) => {
    const platformCode = code as PlatformCode;
    if (platformCode in platformMap) {
      const platform = platformMap[platformCode];
      const url = getSearchUrl(platform, keyword, platform === 'x' ? sixMonthsAgo : undefined);
      return openUrl(url);
    }
  });

  // 并行打开所有URL
  await Promise.all(promises);
}

export default async function Command(props: LaunchProps<{ arguments: SearchArguments }>) {
  try {
    // 优先使用命令参数中的关键词，如果没有则尝试获取选中文本或剪贴板内容
    const searchText = props.arguments.keyword ?? await readtext(props.fallbackText);

    if (isNotEmpty(searchText)) {
      await searchMultiPlatform(searchText, props.arguments.platforms);
      await showHUD("🎉 Open multi platform search");
    } else {
      await showHUD("❌ No text found to search");
    }
  } catch (error) {
    await showHUD("❌ Cannot open multi platform search!");
  }
}