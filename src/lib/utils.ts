/**
 * 从数组中随机选择一个元素
 * @param array 输入数组
 * @returns 随机选中的元素
 */
export function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
} 