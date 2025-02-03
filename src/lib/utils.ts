import { getSelectedText, Clipboard } from "@raycast/api";

/**
 * Randomly select an element from array
 * @param array Input array
 * @returns Randomly selected element
 */
export function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Check if string is not empty
 * @param string String to check
 * @returns True if string is not empty
 */
export const isNotEmpty = (string: string | null | undefined): string is string => {
  return string != null && String(string).trim().length > 0;
};

/**
 * Try to get text with priority:
 * 1. Use fallbackText if provided
 * 2. Get selected text
 * 3. Read clipboard content
 * @param fallbackText Fallback text
 * @returns Promise<string | undefined>
 */
export const readTextWithFallback = async (fallbackText?: string) => {
  return isNotEmpty(fallbackText)
    ? fallbackText?.trim()
    : getSelectedText()
      .then((text) => (isNotEmpty(text) ? text : Clipboard.readText()))
      .catch(() => undefined);
};
