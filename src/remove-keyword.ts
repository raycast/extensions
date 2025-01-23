import { LaunchProps, showHUD } from "@raycast/api";
import { removeKeyword, isKeywordExists } from "./lib/keywords-manager";

// 参数类型定义
type RemoveKeywordArguments = {
  keyword: string;
};

export default async function Command(props: LaunchProps<{ arguments: RemoveKeywordArguments }>) {
  try {
    const { keyword } = props.arguments;

    // 检查关键词是否存在
    if (!(await isKeywordExists(keyword))) {
      await showHUD(`⚠ 关键词 '${keyword}' 不存在`);
      return;
    }

    // 删除关键词
    await removeKeyword(keyword);
    await showHUD(`✅ 已删除关键词: '${keyword}'`);
  } catch (error) {
    console.error('Error in remove-keyword:', error);
    await showHUD('❌ 删除关键词时发生错误');
  }
}
