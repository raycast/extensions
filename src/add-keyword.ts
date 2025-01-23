import { LaunchProps, showHUD } from "@raycast/api";
import { writeKeywords, readKeywords, KEYWORDS_FILE_PATH } from "./lib/keywords-manager";

// 参数类型定义
type AddKeywordArguments = {
  keyword: string;
};

export default async function Command(props: LaunchProps<{ arguments: AddKeywordArguments }>) {
  try {
    const { keyword } = props.arguments;

    // 读取文件
    const keywords = await readKeywords(KEYWORDS_FILE_PATH);

    // 检查关键词是否已存在
    if (keywords.includes(keyword.trim())) {
      await showHUD(`⚠ 关键词 '${keyword}' 已存在`);
      return;
    }

    // 添加关键词并写入
    keywords.push(keyword.trim());
    await writeKeywords(keywords);
    await showHUD(`✅ 已添加关键词: '${keyword}'`);
  } catch (error) {
    console.error('Error in add-keyword:', error);
    await showHUD('❌ 添加关键词时发生错误');
  }
}
