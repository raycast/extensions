import { LocalStorage } from "@raycast/api";

export const DEFAULT_KEYWORDS = ["Claude", "cursor", "RAG", "Gemini", "LLM", "NotebookLM", "Agent"];

const STORAGE_KEY = "keywords";

/**
 * Read keywords list
 * @returns Array of keywords
 */
export async function readKeywords(): Promise<string[]> {
  try {
    const storedKeywordsJson = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!storedKeywordsJson) {
      return DEFAULT_KEYWORDS;
    }
    const keywords = JSON.parse(storedKeywordsJson) as string[];
    return Array.isArray(keywords) && keywords.length > 0 ? keywords : DEFAULT_KEYWORDS;
  } catch (error) {
    console.error("Error reading keywords from storage:", error);
    throw error;
  }
}

/**
 * Write keywords list
 * @param keywords Array of keywords
 */
export async function writeKeywords(keywords: string[]): Promise<void> {
  try {
    // Remove duplicates and filter out empty strings
    const uniqueKeywords = [...new Set(keywords.map((k) => k.trim()).filter((k) => k))];
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueKeywords));
  } catch (error) {
    console.error("Error writing keywords to storage:", error);
    throw error;
  }
}
