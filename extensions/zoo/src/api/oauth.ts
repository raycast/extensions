import { OAuthService } from "@raycast/utils";
import fetch from "node-fetch";
import { Octokit } from "@octokit/core";
import { GithubClient } from "./github-client";

let client: GithubClient | undefined = undefined;

export const githubOAuthService = OAuthService.github({
  scope: "gist",
  onAuthorize: ({ token }) => {
    const octokit = new Octokit({ auth: token, request: { fetch } });

    client = new GithubClient(octokit);
  },
});

export function getGitHubClient() {
  if (!client) {
    throw new Error("GitHub client not initialized");
  }

  return client;
}
