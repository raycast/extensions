import { execFileSync } from "child_process";
import OpenAI from "openai";
import { SYSTEM_PROMPT, SYSTEM_PROMPT_WITH_WEB_SEARCH } from "./config";
import { getShellHistory } from "./history";
import { BuildContext } from "./context";
import { globalCache } from "./cache";

export interface EngineOptions {
  prompt: string;
  model: string;
  provider?: "openai" | "perplexity" | "ollama";
  webSearch?: boolean;
  apiKeys?: {
    openai?: string;
    perplexity?: string;
    ollama?: string;
    context7?: string;
  };
  urls?: {
    openaiUrl?: string;
    ollamaUrl?: string;
  };
  customModels?: {
    openai?: string;
  };
}

export interface EngineResult {
  success: boolean;
  command?: string;
  title: string;
  message?: string;
  source?: "context7" | "ai" | "cache";
}

// Require whitespace or end-of-line after the verb — otherwise things like
// `sh.Command("mkfs.ext4")("--help")` (Python) leak in as "shell commands".
const COMMAND_PREFIX_RE =
  /^(curl|npm|brew|sudo|pip|apt|wget|sh|bash|claude|warp|git|docker)(\s|$)/;
const CTX7_TIMEOUT_MS = 5000;

const normalizeBaseUrl = (url: string) => url.replace(/\/v1\/?$/, "") + "/v1";

// Stop-words stripped when deriving a Context7 library name from a free-form
// prompt. Keeping it tight so multi-word product names ("github copilot",
// "claude code") survive.
const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "of",
  "on",
  "or",
  "the",
  "to",
  "via",
  "with",
  "install",
  "installing",
  "configure",
  "config",
  "set",
  "setup",
  "create",
  "make",
  "use",
  "using",
  "run",
  "show",
  "list",
  "find",
  "get",
  "all",
  "my",
  "globally",
  "global",
  "official",
  "cli",
  "tool",
  "command",
  "line",
  "macos",
  "linux",
  "windows",
  "ubuntu",
  "mac",
  "debian",
  "current",
  "directory",
  "this",
  "that",
]);

function deriveLibraryQuery(prompt: string): string {
  const tokens = prompt
    .toLowerCase()
    .replace(/[^a-z0-9@/\-_.\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  return tokens.slice(0, 4).join(" ").trim();
}

function isTopicallyRelevant(title: string, prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();
  const lowerTitle = title.toLowerCase().trim();
  if (!lowerTitle) return false;
  if (lowerPrompt.includes(lowerTitle)) return true;
  const titleTokens = lowerTitle
    .split(/[\s\-_/]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  if (titleTokens.length === 0) return false;
  return titleTokens.every((t) => lowerPrompt.includes(t));
}

// Lines containing template placeholders aren't runnable as-is.
const PLACEHOLDER_RE =
  /\/path\/to\/|<[a-zA-Z_][\w-]*>|\bYOUR_[A-Z_]+\b|\bREPLACE_[A-Z_]+\b|\[YOUR /;

function hasPlaceholders(line: string): boolean {
  return PLACEHOLDER_RE.test(line);
}

// Specific tokens the prompt explicitly named (config files, jq/yq, etc.).
// A Context7 line must include all of them or it's the wrong shape — fall
// through to the AI which can compose a full multi-step answer.
function promptRequiredTokens(prompt: string): string[] {
  const tokens: string[] = [];
  const files = prompt.match(/[\w-]+\.(json|toml|yaml|yml|conf)/gi);
  if (files) tokens.push(...files);
  const tools = prompt.match(/\b(jq|yq)\b/gi);
  if (tools) tokens.push(...tools);
  return tokens;
}

function getContext7Answer(
  query: string,
  context7ApiKey?: string
): string | null {
  const apiKey =
    context7ApiKey || process.env.CONTEXT7_API_KEY || process.env.CTX7_API_KEY;
  if (!apiKey) return null;

  const libraryQuery = deriveLibraryQuery(query);
  if (!libraryQuery) return null;

  const env = {
    ...process.env,
    CONTEXT7_API_KEY: apiKey,
    CTX7_API_KEY: apiKey,
  };
  const execOpts = {
    encoding: "utf-8" as const,
    env,
    stdio: ["pipe", "pipe", "pipe"] as ["pipe", "pipe", "pipe"],
    timeout: CTX7_TIMEOUT_MS,
  };

  let libraryResult: string;
  try {
    libraryResult = execFileSync("npx", ["ctx7", "library", libraryQuery, query], {
      ...execOpts,
      shell: false,
    }) as string;
  } catch {
    return null;
  }

  const best = findBestLibrary(libraryResult.split("\n"));
  if (!best) return null;

  // Topical guard — reject Context7 hits where the resolved library is
  // unrelated to the user's intent (e.g. "install bun" landing on "Claude
  // Code"). Without this guard Context7 confidently returns the first
  // command-prefix line from whatever docs it found.
  if (!isTopicallyRelevant(best.title, query)) return null;

  let docs: string;
  try {
    docs = execFileSync("npx", ["ctx7", "docs", best.id, query], {
      ...execOpts,
      shell: false,
    }) as string;
  } catch {
    return null;
  }

  const required = promptRequiredTokens(query).map((t) => t.toLowerCase());
  const promptIsInstall = /\binstall(ing|ed)?\b/i.test(query);
  // Numbers ≥ 2 digits that the user named explicitly (counts, ports, limits).
  // Context7 answers should preserve them.
  const promptNumbers = query.match(/\b\d{2,}\b/g) ?? [];
  for (const line of docs.split("\n")) {
    if (!COMMAND_PREFIX_RE.test(line)) continue;
    if (hasPlaceholders(line)) continue;
    // /Volumes/… commands only work after a DMG is mounted — useless on its own.
    if (/\/Volumes\//.test(line)) continue;
    if (required.length > 0) {
      const lower = line.toLowerCase();
      if (!required.every((t) => lower.includes(t))) continue;
    }
    if (
      promptIsInstall &&
      !/\binstall\b/i.test(line) &&
      !/\|\s*(bash|sh|zsh)\b/i.test(line)
    ) {
      continue;
    }
    if (
      promptNumbers.length > 0 &&
      !promptNumbers.some((n) => line.includes(n))
    )
      continue;
    return line.trim();
  }
  return null;
}

function findBestLibrary(
  lines: string[]
): { id: string; title: string } | null {
  let bestId: string | null = null;
  let bestTitle = "";
  let maxScore = -1;
  let currentTitle = "";

  for (let i = 0; i < lines.length; i++) {
    const titleMatch = lines[i].match(/^\s*\d+\.\s+Title:\s+(.+)/);
    if (titleMatch) currentTitle = titleMatch[1].trim();

    if (!lines[i].includes("Context7-compatible library ID:")) continue;
    const id = lines[i].split(":")[1]?.trim();
    if (!id) continue;

    for (let j = i; j < Math.min(i + 10, lines.length); j++) {
      if (!lines[j].includes("Source Reputation: High")) continue;
      const scoreMatch = lines[j + 1]?.match(/Benchmark Score:\s*([\d.]+)/);
      if (!scoreMatch) continue;
      const score = parseFloat(scoreMatch[1]);
      if (score > maxScore) {
        maxScore = score;
        bestId = id;
        bestTitle = currentTitle;
      }
    }
  }

  return bestId ? { id: bestId, title: bestTitle } : null;
}

function looksLikeSolidAnswer(answer: string | null): answer is string {
  return !!answer && answer.length >= 3 && COMMAND_PREFIX_RE.test(answer);
}

async function buildContextualSystemPrompt(
  _basePrompt: string,
  repoRoot?: string,
  shell?: string,
  webSearch?: boolean
): Promise<string> {
  let prompt = webSearch
    ? SYSTEM_PROMPT_WITH_WEB_SEARCH
    : SYSTEM_PROMPT;

  if (repoRoot) {
    prompt += ` You are in a git repository at ${repoRoot}. Consider the repository context when suggesting commands.`;
  }

  if (shell) {
    try {
      const recentCommands = await getShellHistory(shell, 10);
      if (recentCommands.length > 0) {
        const historyList = recentCommands
          .map((cmd, i) => `${i + 1}. ${cmd}`)
          .join("\n");
        prompt += `\n\nRecent commands in this session:\n${historyList}`;
      }
    } catch {
      /* history is best-effort */
    }
  }

  return prompt;
}

export async function convertPrompt(
  options: EngineOptions
): Promise<EngineResult> {
  const {
    prompt,
    model,
    provider = "openai",
    webSearch = false,
    apiKeys = {},
    urls = {},
    customModels = {},
  } = options;

  const isOllama = provider === "ollama";
  const isOpenAI = provider === "openai";
  const isPerplexity = provider === "perplexity";

  let resolvedModel = model;
  if (isOpenAI && webSearch) {
    resolvedModel = "gpt-5-search-api";
  } else if (isOpenAI && urls.openaiUrl && customModels.openai) {
    resolvedModel = customModels.openai;
  }

  const apiKey = isOpenAI
    ? apiKeys.openai
    : isPerplexity
    ? apiKeys.perplexity
    : apiKeys.ollama;
  if (!apiKey && !isOllama) {
    return {
      success: false,
      title: "API key not configured",
      message: `Please provide ${provider} API key`,
    };
  }

  try {
    const cwd = process.cwd();
    const cacheKey = cwd + "\x00" + prompt;
    const cached = globalCache.get(cacheKey);
    if (cached) {
      return {
        success: true,
        title: "Command generated",
        command: cached,
        source: "cache",
      };
    }

    const context7Answer = getContext7Answer(prompt, apiKeys.context7);
    if (looksLikeSolidAnswer(context7Answer)) {
      globalCache.put(cacheKey, context7Answer);
      return {
        success: true,
        title: "Command generated",
        command: context7Answer,
        source: "context7",
      };
    }

    const resolvedBaseURL = isOllama
      ? normalizeBaseUrl(urls.ollamaUrl || "http://localhost:11434")
      : isPerplexity
      ? "https://api.perplexity.ai"
      : urls.openaiUrl
      ? normalizeBaseUrl(urls.openaiUrl)
      : undefined;

    const client = new OpenAI({
      apiKey: isOllama ? (apiKey?.trim() || "ollama") : (apiKey as string).trim(),
      baseURL: resolvedBaseURL,
    });

    const context = BuildContext();
    const contextualSystemPrompt = await buildContextualSystemPrompt(
      "",
      context.repoRoot,
      context.shell,
      webSearch
    );

    const response = await client.chat.completions.create({
      model: resolvedModel,
      max_completion_tokens: 1024,
      ...(resolvedModel === "gpt-5-search-api" && { web_search_options: {} }),
      messages: [
        { role: "system", content: contextualSystemPrompt },
        { role: "user", content: prompt },
      ],
    });

    const command = response.choices[0].message.content?.trim() || "";
    if (!command) {
      return { success: false, title: "No command generated" };
    }

    globalCache.put(cacheKey, command);
    return { success: true, title: "Command generated", command, source: "ai" };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, title: "API Error", message: errorMessage };
  }
}
