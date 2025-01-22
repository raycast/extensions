import { environment } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";

export const DEFAULT_KEYWORDS = ["Claude", "cursor", "RAG", "prompt", "AI"];
export const KEYWORDS_FILE_PATH = path.join(environment.supportPath, 'keywords.txt');

export function ensureDirectoryExists(filePath: string) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

export function readKeywords(filePath: string = KEYWORDS_FILE_PATH): string[] {
  try {
    ensureDirectoryExists(filePath);

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const keywords = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (keywords.length > 0) {
        return keywords;
      }
    } else {
      // 如果文件不存在，创建默认文件
      fs.writeFileSync(filePath, DEFAULT_KEYWORDS.join('\n'), 'utf-8');
      console.log('Created default keywords file');
    }
  } catch (error) {
    console.error('Error handling keywords file:', error);
  }

  return DEFAULT_KEYWORDS;
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

export function addKeyword(keyword: string, filePath: string = KEYWORDS_FILE_PATH): void {
  const keywords = readKeywords(filePath);
  if (!keywords.includes(keyword)) {
    keywords.push(keyword);
    writeKeywords(keywords, filePath);
  }
}

export function removeKeyword(keyword: string, filePath: string = KEYWORDS_FILE_PATH): void {
  const keywords = readKeywords(filePath);
  const updatedKeywords = keywords.filter(k => k !== keyword);
  writeKeywords(updatedKeywords, filePath);
} 