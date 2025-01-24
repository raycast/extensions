import { LaunchProps, showHUD, getPreferenceValues } from "@raycast/api";
import { searchOnPlatform, Platform, getRandomUnusedPlatform } from './lib/platform-searcher';
import { isNotEmpty, readTextWithFallback } from './lib/utils';

interface Preferences {
  defaultPlatform1: Platform;
  defaultPlatform2: Platform | "";
  randomPlatform: boolean;
}

// 参数类型定义
type SearchArguments = {
  keyword?: string;
};

export default async function Command(props: LaunchProps<{ arguments: SearchArguments }>) {
  try {
    // 获取搜索关键词
    const searchText = await readTextWithFallback(props.arguments.keyword);

    if (isNotEmpty(searchText)) {
      const preferences = getPreferenceValues<Preferences>();

      // 计算日期：两个月前
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      const dateString = twoMonthsAgo.toISOString().split("T")[0];

      // 获取要搜索的平台
      const selectedPlatforms = [preferences.defaultPlatform1];
      if (preferences.defaultPlatform2) {
        selectedPlatforms.push(preferences.defaultPlatform2);
      }

      // 在选定的平台上搜索
      for (const platform of selectedPlatforms) {
        await searchOnPlatform(platform, searchText, dateString);
      }

      // 如果启用了随机平台选项，在一个额外的随机平台上搜索
      if (preferences.randomPlatform) {
        const randomPlatform = getRandomUnusedPlatform(selectedPlatforms);
        await searchOnPlatform(randomPlatform, searchText, dateString);
      }

      await showHUD(`✅ Search specified keyword: '${searchText}'`, { clearRootSearch: true });
    } else {
      await showHUD("❌ No search keyword provided");
    }
  } catch (error) {
    await showHUD("❌ Open specified search failed");
  }
}

