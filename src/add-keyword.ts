import { LaunchProps, showHUD } from "@raycast/api";
import { addKeyword, isKeywordExists } from "./lib/keywords-manager";

// 参数类型定义
type AddKeywordArguments = {
  keyword: string;
};

export default async function Command(props: LaunchProps<{ arguments: AddKeywordArguments }>) {
  try {
    const { keyword } = props.arguments;

    // 检查关键词是否已存在
    if (await isKeywordExists(keyword)) {
      await showHUD(`⚠ 关键词 '${keyword}' 已存在`);
      return;
    }

    // 添加关键词
    await addKeyword(keyword);
    await showHUD(`✅ 已添加关键词: '${keyword}'`);
  } catch (error) {
    console.error('Error in add-keyword:', error);
    await showHUD('❌ 添加关键词时发生错误');
  }
}
