import { LaunchProps, showHUD } from "@raycast/api";
import { writeKeywords, readKeywords, KEYWORDS_FILE_PATH } from "./lib/keywords-manager";

// 参数类型定义
type RemoveKeywordArguments = {
  keyword: string;
};

export default async function Command(props: LaunchProps<{ arguments: RemoveKeywordArguments }>) {
  try {
    const { keyword } = props.arguments;

    // 只读取一次文件
    const keywords = await readKeywords(KEYWORDS_FILE_PATH);

    // 检查关键词是否存在
    if (!keywords.includes(keyword.trim())) {
      await showHUD(`⚠ 关键词 '${keyword}' 不存在`);
      return;
    }

    // 删除关键词并写入
    const updatedKeywords = keywords.filter(k => k.trim() !== keyword.trim());
    await writeKeywords(updatedKeywords);
    await showHUD(`✅ 已删除关键词: '${keyword}'`);
  } catch (error) {
    console.error('Error in remove-keyword:', error);
    await showHUD('❌ 删除关键词时发生错误');
  }
}
