import { environment } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import { readFile, writeFile, access } from "fs/promises";

export const DEFAULT_KEYWORDS = ["Claude", "cursor", "RAG", "prompt", "AI"];
export const KEYWORDS_FILE_PATH = path.join(environment.supportPath, "keywords.txt");

/**
 * 检查文件是否存在
 * @param filePath 文件路径
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
 * 确保目录存在并写入内容
 * @param filePath 文件路径
 * @param content 文件内容
 */
async function ensureAndWrite(filePath: string, content: string): Promise<void> {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
  await writeFile(filePath, content, "utf-8");
}

/**
 * 读取关键词列表
 * @param filePath 关键词文件路径
 * @returns 关键词数组
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
 * 写入关键词列表
 * @param keywords 关键词数组
 * @param filePath 文件路径
 */
export async function writeKeywords(keywords: string[], filePath: string = KEYWORDS_FILE_PATH): Promise<void> {
  try {
    const content = keywords.filter((k) => k.trim()).join("\n");
    await ensureAndWrite(filePath, content);
  } catch (error) {
    console.error("Error writing keywords file:", error);
    throw error;
  }
}
