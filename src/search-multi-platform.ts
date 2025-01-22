import { PlatformCode, platformMap, searchOnPlatform } from './lib/platform-searcher';
import { subMonths, format } from 'date-fns';
import { LaunchProps, showHUD } from "@raycast/api";
import { isNotEmpty, readTextWithFallback } from "./lib/utils";
import { getRandomElement } from "./lib/utils";

// 默认的可选平台列表
const OPTIONAL_PLATFORMS: PlatformCode[] = ['h', 'r', 'm', 'z', 'b', 'y'];
// 默认总是包含的平台
const DEFAULT_PLATFORMS: PlatformCode[] = ['x', 'v'];

// 参数类型定义
type SearchArguments = {
  keyword?: string;
  platforms?: string;
};

/**
 * 在多个平台上搜索
 * @param keyword 搜索关键词
 * @param platformCodes 平台代码字符串 (例如: "xvh")
 */
async function searchMultiPlatform(keyword: string, platformCodes?: string): Promise<void> {
  let platforms: PlatformCode[];

  if (!platformCodes) {
    // 如果未指定平台，使用默认平台加一个随机平台
    const randomPlatform = getRandomElement(OPTIONAL_PLATFORMS);
    platforms = [...DEFAULT_PLATFORMS, randomPlatform];
  } else {
    // 将输入的平台代码转换为有效的平台代码数组
    platforms = Array.from(platformCodes.toLowerCase())
      .filter((code): code is PlatformCode => code in platformMap);
  }

  if (platforms.length === 0) {
    throw new Error("No valid platforms specified");
  }

  // 计算6个月前的日期（仅用于 X 平台）
  const sixMonthsAgo = format(subMonths(new Date(), 6), 'yyyy-MM-dd');

  // 并行处理所有平台的搜索
  const searchPromises = platforms.map(async (platformCode) => {
    try {
      const platform = platformMap[platformCode];
      const date = platform === 'x' ? sixMonthsAgo : undefined;
      await searchOnPlatform(platform, keyword, date);
    } catch (error) {
      console.error(`Failed to search on platform ${platformCode}:`, error);
    }
  });

  await Promise.all(searchPromises);
}

export default async function Command(props: LaunchProps<{ arguments: SearchArguments }>) {
  try {
    // 优先使用命令参数中的关键词，如果没有则尝试获取选中文本或剪贴板内容
    const searchText = props.arguments.keyword ?? await readTextWithFallback(props.fallbackText);

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