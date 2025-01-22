import { getSelectedText, Clipboard } from "@raycast/api";

/**
 * 检查字符串是否非空
 * @param string 要检查的字符串
 * @returns 如果字符串非空则返回 true
 */
export const isNotEmpty = (string: string | null | undefined): string is string => {
  return string != null && String(string).trim().length > 0;
};

/**
 * 读取文本，优先级：
 * 1. 传入的回退文本
 * 2. 选中的文本
 * 3. 剪贴板中的文本
 * @param fallbackText 回退文本
 * @returns Promise<string | undefined>
 */
export const readTextWithFallback = (fallbackText?: string) =>
  isNotEmpty(fallbackText)
    ? fallbackText?.trim()
    : getSelectedText()
      .then((text) => (isNotEmpty(text) ? text : Clipboard.readText()))
      .catch(() => undefined);

/**
 * 从数组中随机选择一个元素
 * @param array 输入数组
 * @returns 随机选中的元素
 */
export function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
} 