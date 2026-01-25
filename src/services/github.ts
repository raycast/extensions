import { getPreferenceValues } from "@raycast/api";
import { Octokit } from "octokit";

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  owner: {
    login: string;
    avatar_url: string;
  };
  updated_at: string;
  pushed_at: string;
  private: boolean;
}

interface Preferences {
  githubToken: string;
}

const preferences = getPreferenceValues<Preferences>();

const octokit = new Octokit({
  auth: preferences.githubToken,
});

interface GitHubOrg {
  login: string;
}

async function fetchUserOrgs(): Promise<string[]> {
  try {
    const orgs = await octokit.paginate("GET /user/orgs", {
      per_page: 100,
    });
    return (orgs as GitHubOrg[]).map((org) => org.login);
  } catch (error) {
    console.error("Error fetching user orgs:", error);
    return [];
  }
}

async function fetchUserRepos(): Promise<Repository[]> {
  try {
    const repos = await octokit.paginate("GET /user/repos", {
      visibility: "all",
      sort: "pushed",
      per_page: 100,
    });
    return repos as Repository[];
  } catch (error) {
    console.error("Error fetching user repos:", error);
    return [];
  }
}

async function fetchOrgRepos(org: string): Promise<Repository[]> {
  try {
    const repos = await octokit.paginate("GET /orgs/{org}/repos", {
      org,
      sort: "pushed",
      per_page: 100,
    });
    return repos as Repository[];
  } catch (error) {
    console.error(`Error fetching repos for org ${org}:`, error);
    return [];
  }
}

export async function fetchAllRepos(): Promise<Repository[]> {
  // Auto-discover organizations via GitHub API
  const orgs = await fetchUserOrgs();

  const promises = [fetchUserRepos(), ...orgs.map((org) => fetchOrgRepos(org))];

  const results = await Promise.all(promises);

  // Flatten and deduplicate by ID
  const allRepos = results.flat();
  const uniqueRepos = Array.from(
    new Map(allRepos.map((repo) => [repo.id, repo])).values(),
  );

  return uniqueRepos.sort(
    (a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime(),
  );
}
