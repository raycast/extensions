import { request, resolveCredentials } from "./client";
import { normalizeMergeRequests, normalizeRepositories, type MergeRequest, type Repository } from "./codeup-normalize";

export type { MergeRequest, Repository } from "./codeup-normalize";

type ListResponse<T> = T[] | { result?: T[]; data?: T[]; total?: number };

function codeupPath(suffix: string): string {
    const credentials = resolveCredentials();
    if (credentials.mode === "region") return `/oapi/v1/codeup/${suffix}`;
    return `/oapi/v1/codeup/organizations/${encodeURIComponent(credentials.organizationId)}/${suffix}`;
}

async function loadAll<T>(loadPage: (page: number) => Promise<{ items: T[]; total?: number }>): Promise<T[]> {
    const all: T[] = [];
    const pageSize = 100;
    for (let page = 1; page <= 150; page += 1) {
        const result = await loadPage(page);
        all.push(...result.items);
        if (result.items.length < pageSize || (result.total !== undefined && all.length >= result.total)) break;
    }
    return all;
}

export { normalizeMergeRequests, normalizeRepositories };

export function listRepositories(options: { signal?: AbortSignal } = {}): Promise<Repository[]> {
    return loadAll(async (page) => {
        const response = await request<ListResponse<unknown>>(codeupPath("repositories"), {
            query: { page, perPage: 100, orderBy: "last_activity_at", sort: "desc", archived: "false" },
            signal: options.signal,
        });
        return {
            items: normalizeRepositories(response),
            total: !Array.isArray(response) && typeof response.total === "number" ? response.total : undefined,
        };
    });
}

/** 合并请求 state 过滤值：默认 opened（开启），也支持 merged / closed。 */
export type MergeRequestStateFilter = "opened" | "merged" | "closed";

/**
 * 列出当前组织下的合并请求。
 *
 * 官方文档：
 *   GET /oapi/v1/codeup/organizations/{organizationId}/changeRequests
 *   Header: x-yunxiao-token
 *   Query: { page, perPage, projectIds?, authorIds?, reviewerIds?, state?, search?, orderBy, sort, createdAfter?, createdBefore? }
 *   state 取值：opened（默认，开启） / merged / closed
 *
 * 响应：顶层 JSON 数组，每个元素包含 localId / projectId / state / sourceBranch / targetBranch / author / webUrl / detailUrl 等字段。
 * 默认按 state=opened 拉取，涵盖评审中、待合并等所有处于开启状态的请求。
 */
export function listOpenMergeRequests(
    options: { signal?: AbortSignal; state?: MergeRequestStateFilter } = {},
): Promise<MergeRequest[]> {
    const { signal, state = "opened" } = options;
    return loadAll(async (page) => {
        const response = await request<ListResponse<unknown>>(codeupPath("changeRequests"), {
            query: {
                page,
                perPage: 100,
                state,
                orderBy: "updated_at",
                sort: "desc",
            },
            signal,
        });
        return {
            items: normalizeMergeRequests(response),
            total: !Array.isArray(response) && typeof response.total === "number" ? response.total : undefined,
        };
    });
}
