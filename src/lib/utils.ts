import { getSelectedText, Clipboard } from "@raycast/api";

/**
 * 从数组中随机选择一个元素
 * @param array 输入数组
 * @returns 随机选中的元素
 */
export function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 检查字符串是否非空
 * @param string 要检查的字符串
 * @returns 如果字符串非空则返回 true
 */
export const isNotEmpty = (string: string | null | undefined): string is string => {
  return string != null && String(string).trim().length > 0;
};

/**
 * 按优先级尝试获取文本：
 * 1. 使用传入的 fallbackText
 * 2. 获取选中的文本
 * 3. 读取剪贴板内容
 * @param fallbackText 回退文本
 * @returns Promise<string | undefined>
 */
export const readTextWithFallback = async (fallbackText?: string) => {
  return isNotEmpty(fallbackText)
    ? fallbackText?.trim()
    : getSelectedText()
        .then((text) => (isNotEmpty(text) ? text : Clipboard.readText()))
        .catch(() => undefined);
};
