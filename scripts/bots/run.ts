// Runs one of the bots in this folder with an authenticated GitHub client, e.g. `node run.ts pr-bot.ts`.
import { context, getOctokit } from "@actions/github";
import { defaults as defaultGitHubOptions } from "@actions/github/lib/utils";
import { requestLog } from "@octokit/plugin-request-log";
import * as core from "@actions/core";

const BOTS = ["pr-bot.ts", "issue-bot.ts"];
const REQUEST_TIMEOUT_MS = 10000;

process.on("unhandledRejection", handleError);
main().catch(handleError);

async function main(): Promise<void> {
  const script = process.argv[2];
  if (!BOTS.includes(script)) {
    throw new Error(`Unknown bot "${script}". Expected one of: ${BOTS.join(", ")}`);
  }

  const token = process.env.GITHUB_ACCESS_TOKEN;
  if (!token) {
    throw new Error("GITHUB_ACCESS_TOKEN is not set");
  }

  // Octokit's fetch has no `timeout` option: wrap the default (proxy-aware) fetch to give each request its own abort signal.
  const baseFetch: typeof fetch = defaultGitHubOptions.request?.fetch ?? fetch;
  const github = getOctokit(
    token,
    {
      ...defaultGitHubOptions,
      retry: { enabled: false },
      request: {
        ...defaultGitHubOptions.request,
        fetch: (url: string, init: RequestInit) =>
          baseFetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) }),
      },
    },
    requestLog,
  );

  const bot = await import(`./${script}`);
  await bot.default({ github, context, core });
}

function handleError(err: unknown): void {
  console.error(err);
  core.setFailed(`Unhandled error: ${err}`);
}
