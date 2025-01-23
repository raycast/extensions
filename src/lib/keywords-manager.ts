import { environment } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import { readFile, writeFile } from "fs/promises";

export const DEFAULT_KEYWORDS = ["Claude", "cursor", "RAG", "prompt", "AI"];
export const KEYWORDS_FILE_PATH = path.join(environment.supportPath, 'keywords.txt');

/**
 * 确保目录存在
 * @param filePath 文件路径
 */
function ensureDirectoryExists(filePath: string): void {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

/**
 * 读取关键词列表
 * @param filePath 关键词文件路径
 * @returns 关键词数组
 */
export async function readKeywords(filePath: string): Promise<string[]> {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const content = await readFile(filePath, 'utf-8');
    return content.split('\n').filter(line => line.trim());
  } catch (error) {
    console.error('Error reading keywords file:', error);
    return [];
  }
}

/**
 * 写入关键词列表
 * @param keywords 关键词数组
 * @param filePath 文件路径
 */
export async function writeKeywords(keywords: string[], filePath: string = KEYWORDS_FILE_PATH): Promise<void> {
  try {
    ensureDirectoryExists(filePath);
    await writeFile(filePath, keywords.join('\n'), 'utf-8');
  } catch (error) {
    console.error('Error writing keywords file:', error);
    throw error;
  }
}