import { Icon } from "@raycast/api";

export interface GistFile {
  filename: string;
  content: string;
}

export interface GistItem {
  filename: string;
  language: string;
  raw_url: string;
  size: string;
  type?: string;
}

export interface Gist {
  gist_id: string;
  description: string;
  html_url: string;
  file: GistItem[];
}

export enum GithubGistTag {
  MY_GISTS = "My Gists",
  STARRED = "Starred Gists",
  ALL_GISTS = "Public Gists",
  PROMPT = "Prompt",
}

export const githubGistTags = [
  { title: GithubGistTag.MY_GISTS, value: GithubGistTag.MY_GISTS, icon: Icon.Person },
  { title: GithubGistTag.STARRED, value: GithubGistTag.STARRED, icon: Icon.Stars },
  { title: GithubGistTag.ALL_GISTS, value: GithubGistTag.ALL_GISTS, icon: Icon.TwoPeople },
  { title: GithubGistTag.PROMPT, value: GithubGistTag.PROMPT, icon: Icon.Terminal },
];

export function validateGistFileName(files: GistFile[]) {
  const filenameCounts = new Map<string, number>();

  files.forEach((file) => {
    const count = filenameCounts.get(file.filename) || 0;
    filenameCounts.set(file.filename, count + 1);
  });

  return files.map((file) => {
    const count = filenameCounts.get(file.filename);
    return {
      error: count && count > 1 ? "Content must have unique filename" : undefined,
    };
  });
}

export function validateGistFileContents(files: GistFile[]) {
  return files.map((file) => {
    return {
      error: !file.content.trim() ? "Content cannot be empty" : undefined,
    };
  });
}
