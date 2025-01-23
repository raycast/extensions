import { environment } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import { readFile, writeFile, appendFile } from "fs/promises";
import { existsSync } from "fs";

export const DEFAULT_KEYWORDS = ["Claude", "cursor", "RAG", "prompt", "AI"];
export const KEYWORDS_FILE_PATH = path.join(environment.supportPath, 'keywords.txt');

export function ensureDirectoryExists(filePath: string) {
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
  if (!existsSync(filePath)) {
    return [];
  }
  const content = await readFile(filePath, 'utf-8');
  return content.toString().trim().split('\n').filter(Boolean);
}

export function writeKeywords(keywords: string[], filePath: string = KEYWORDS_FILE_PATH): void {
  try {
    ensureDirectoryExists(filePath);
    fs.writeFileSync(filePath, keywords.join('\n'), 'utf-8');
  } catch (error) {
    console.error('Error writing keywords file:', error);
    throw error;
  }
}

export async function addKeyword(keyword: string, filePath: string = KEYWORDS_FILE_PATH): Promise<void> {
  const keywords = await readKeywords(filePath);
  if (!keywords.includes(keyword)) {
    keywords.push(keyword);
    writeKeywords(keywords, filePath);
  }
}

export async function removeKeyword(keyword: string, filePath: string = KEYWORDS_FILE_PATH): Promise<void> {
  const keywords = await readKeywords(filePath);
  const updatedKeywords = keywords.filter(k => k !== keyword);
  writeKeywords(updatedKeywords, filePath);
}

/**
 * 检查关键词是否已存在
 * @param keyword 要检查的关键词
 * @returns 如果关键词存在则返回 true
 */
export async function isKeywordExists(keyword: string): Promise<boolean> {
  const keywords = await readKeywords(KEYWORDS_FILE_PATH);
  return keywords.includes(keyword.trim());
} 