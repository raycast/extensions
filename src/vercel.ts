const VERCEL_API_BASE_URL = "https://api.vercel.com";
const VERCEL_DASHBOARD_API_BASE_URL = "https://vercel.com";

export type VercelProject = {
  id: string;
  name: string;
  accountId?: string;
};

export type ProjectTrafficCoreMetrics = {
  visitors: number;
  periodLabel: string;
};

type RequestOptions = {
  apiKey: string;
  path: string;
  searchParams?: Record<string, string>;
  timeoutMs?: number;
  baseUrl?: string;
};

export class VercelApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "VercelApiError";
    this.status = status;
  }
}

async function requestJson<T>({
  apiKey,
  path,
  searchParams,
  timeoutMs = 8000,
  baseUrl = VERCEL_API_BASE_URL,
}: RequestOptions): Promise<T> {
  const url = new URL(`${baseUrl}${path}`);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "*/*",
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Vercel request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    const message = errorText || `Vercel request failed with status ${response.status}`;
    throw new VercelApiError(message, response.status);
  }

  return (await response.json()) as T;
}

type ProjectListResponse = {
  projects?: Array<{ id?: string; name?: string; accountId?: string }>;
};

export async function listProjects(apiKey: string): Promise<VercelProject[]> {
  const response = await requestJson<ProjectListResponse>({
    apiKey,
    path: "/v9/projects",
    searchParams: {
      limit: "100",
    },
  });

  const projects = (response.projects ?? [])
    .filter((project): project is { id: string; name: string; accountId?: string } =>
      Boolean(project.id && project.name),
    )
    .map((project) => ({ id: project.id, name: project.name, accountId: project.accountId }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return projects;
}

function getNumberLikeValue(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const raw = record[key];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === "string") {
      const parsed = Number(raw);
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function extractRowsFromDashboardResponse(response: unknown): Record<string, unknown>[] {
  if (!response || typeof response !== "object") {
    return [];
  }
  const record = response as Record<string, unknown>;
  const data = record.data;
  if (!Array.isArray(data)) {
    return [];
  }
  return data.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"));
}

function getVisitorCountFromRow(row: Record<string, unknown>): number | null {
  return getNumberLikeValue(row, ["devices", "visitors", "uniqueVisitors", "uniques", "total", "value", "count"]);
}

function extractVisitorTotal(response: unknown): number | null {
  const rows = extractRowsFromDashboardResponse(response);
  if (rows.length === 0) {
    return null;
  }

  // Use homepage aggregate row when available.
  const homepageRow = rows.find((row) => row.key === "/");
  if (homepageRow) {
    const homepageVisitors = getVisitorCountFromRow(homepageRow);
    if (homepageVisitors !== null) {
      return Math.max(0, Math.round(homepageVisitors));
    }
  }

  const firstRowVisitors = getVisitorCountFromRow(rows[0]);
  if (firstRowVisitors !== null) {
    return Math.max(0, Math.round(firstRowVisitors));
  }

  let totalVisitors = 0;
  let hasValues = false;
  for (const row of rows) {
    const value = getVisitorCountFromRow(row);
    if (value !== null) {
      totalVisitors += value;
      hasValues = true;
    }
  }

  return hasValues ? Math.max(0, Math.round(totalVisitors)) : null;
}

async function getDashboardVisitorTotal(
  apiKey: string,
  project: Pick<VercelProject, "id" | "name" | "accountId">,
): Promise<number | null> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const identifiers = [project.name, project.id];

  let lastDashboardError: Error | null = null;
  let lastResponseKeys: string[] = [];

  for (const projectId of identifiers) {
    try {
      const searchParams: Record<string, string> = {
        environment: "production",
        filter: "{}",
        from: sevenDaysAgo.toISOString(),
        limit: "250",
        projectId,
        to: now.toISOString(),
        type: "path",
        metric: "visitors",
        tz: timeZone,
        ...(project.accountId ? { teamId: project.accountId } : {}),
      };

      const response = await requestJson<unknown>({
        apiKey,
        baseUrl: VERCEL_DASHBOARD_API_BASE_URL,
        path: "/api/web-analytics/stats",
        timeoutMs: 5000,
        searchParams,
      });

      const visitors = extractVisitorTotal(response);
      if (visitors !== null) {
        return visitors;
      }

      if (response && typeof response === "object") {
        lastResponseKeys = Object.keys(response as Record<string, unknown>).slice(0, 6);
      }
    } catch (error) {
      lastDashboardError = error instanceof Error ? error : new Error("Unknown dashboard analytics error");
    }
  }

  if (lastDashboardError) {
    throw lastDashboardError;
  }

  if (lastResponseKeys.length > 0) {
    throw new Error(`Dashboard analytics response shape unsupported (${lastResponseKeys.join(", ")})`);
  }

  return null;
}

export async function getProjectTrafficCoreMetrics(
  apiKey: string,
  project: Pick<VercelProject, "id" | "name" | "accountId">,
): Promise<ProjectTrafficCoreMetrics> {
  const visitors = await getDashboardVisitorTotal(apiKey, project);
  if (visitors !== null) {
    return {
      visitors,
      periodLabel: "Last 7 days",
    };
  }

  throw new Error("Dashboard analytics response did not include visitor totals");
}
