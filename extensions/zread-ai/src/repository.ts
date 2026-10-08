import { URL } from "node:url";

export interface RepositoryIdentifier {
  owner: string;
  repo: string;
}

export function getZreadUrl({ owner, repo }: RepositoryIdentifier): string {
  return `https://zread.ai/${owner}/${repo}`;
}

export function getGitHubUrl({ owner, repo }: RepositoryIdentifier): string {
  return `https://github.com/${owner}/${repo}`;
}

export function normalizeToZreadUrl(input: string): string {
  return getZreadUrl(parseRepositoryIdentifier(input));
}

export function parseRepositoryIdentifier(input: string): RepositoryIdentifier {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    throw new Error("Repository input is required.");
  }

  if (trimmedInput.startsWith("https://github.com/")) {
    const url = new URL(trimmedInput);
    const [owner, repo] = url.pathname.split("/").filter(Boolean);

    if (!owner || !repo) {
      throw new Error("Expected a repository URL in the format https://github.com/owner/repo.");
    }

    return { owner, repo: stripGitSuffix(repo) };
  }

  const [owner, repo, ...rest] = trimmedInput.split("/").filter(Boolean);

  if (!owner || !repo || rest.length > 0) {
    throw new Error("Expected a GitHub URL or owner/repo.");
  }

  return { owner, repo: stripGitSuffix(repo) };
}

function stripGitSuffix(repo: string): string {
  return repo.endsWith(".git") ? repo.slice(0, -4) : repo;
}
