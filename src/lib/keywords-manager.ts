import { environment } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import { readFile, writeFile, access } from "fs/promises";

export const DEFAULT_KEYWORDS = ["Claude", "cursor", "RAG", "prompt", "AI"];
export const KEYWORDS_FILE_PATH = path.join(environment.supportPath, "keywords.txt");

/**
 * Check if file exists
 * @param filePath File path
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure directory exists and write content to file
 * @param filePath File path
 * @param content File content
 */
async function ensureAndWrite(filePath: string, content: string): Promise<void> {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
  await writeFile(filePath, content, "utf-8");
}

/**
 * Read keywords list
 * @param filePath Path to keywords file
 * @returns Array of keywords
 */
export async function readKeywords(filePath: string = KEYWORDS_FILE_PATH): Promise<string[]> {
  try {
    const exists = await fileExists(filePath);
    if (!exists) {
      await ensureAndWrite(filePath, DEFAULT_KEYWORDS.join("\n"));
      return DEFAULT_KEYWORDS;
    }

    const content = await readFile(filePath, "utf-8");
    const keywords = content.split("\n").filter((line) => line.trim());
    return keywords.length > 0 ? keywords : DEFAULT_KEYWORDS;
  } catch (error) {
    console.error("Error reading keywords file:", error);
    return DEFAULT_KEYWORDS;
  }
}

/**
 * Write keywords list
 * @param keywords Array of keywords
 * @param filePath Path to file
 */
export async function writeKeywords(keywords: string[], filePath: string = KEYWORDS_FILE_PATH): Promise<void> {
  try {
    // Remove duplicates and filter out empty strings
    const uniqueKeywords = [...new Set(keywords.map((k) => k.trim()).filter((k) => k))];
    const content = uniqueKeywords.join("\n");
    await ensureAndWrite(filePath, content);
  } catch (error) {
    console.error("Error writing keywords file:", error);
    throw error;
  }
}
