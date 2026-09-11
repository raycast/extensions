/**
 * 云效迭代（Sprint）相关接口。
 *
 * 官方文档：https://help.aliyun.com/zh/yunxiao/developer-reference/listsprints
 *
 * 端点（GET，参数走 query）：
 *   /oapi/v1/projex/organizations/{organizationId}/projects/{projectId}/sprints   (central)
 *   /oapi/v1/projex/projects/{projectId}/sprints                                  (region)
 * 鉴权：x-yunxiao-token
 *
 * 可选查询参数：
 *   - status：TODO / DOING / ARCHIVED（多选用逗号分隔）
 *   - name ：名称模糊匹配
 *   - page / perPage：分页（perPage 上限 200）
 *
 * 响应：裸数组 [Sprint, ...]；分页信息通过响应头（x-page、x-per-page、x-total、
 * x-next-page、x-total-pages）携带，本扩展一次拉一页。
 */

import { buildProjectPath, resolveCredentials, request } from "./client";
import { normalizeSprints } from "./sprints-normalize";
import type { Sprint } from "./types";

export { normalizeSprints };

/** 官方支持的状态枚举。 */
export type SprintStatus = "TODO" | "DOING" | "ARCHIVED";

export interface SearchSprintsOptions {
    /** 项目 id（path 段） */
    projectId: string;
    /** 状态过滤；多选用逗号分隔；不传则拉全部状态 */
    status?: SprintStatus | SprintStatus[] | null;
    /** 名称模糊匹配 */
    name?: string | null;
    /** 每页大小，默认 50，上限 200 */
    perPage?: number;
    /** 页码，从 1 开始，默认 1 */
    page?: number;
    signal?: AbortSignal;
}

function clampPerPage(n: number): number {
    if (!Number.isFinite(n)) return 50;
    return Math.min(200, Math.max(1, Math.floor(n)));
}

function statusQueryValue(status: SprintStatus | SprintStatus[] | null | undefined): string | undefined {
    if (!status) return undefined;
    if (Array.isArray(status)) {
        const filtered = status.filter((value): value is SprintStatus => Boolean(value));
        return filtered.length > 0 ? filtered.join(",") : undefined;
    }
    return status;
}

/**
 * 列出项目下的迭代。
 *
 * 默认每页 50 条（官方上限 200）。常规组织一次拉完即覆盖；
 * 如需分页可显式传 perPage / page。
 */
export async function searchSprints(opts: SearchSprintsOptions): Promise<Sprint[]> {
    const creds = resolveCredentials();
    const projectId = (opts.projectId ?? "").trim();
    if (!projectId) throw new Error("缺少 projectId。");

    const path = `${buildProjectPath(creds, `projects/${encodeURIComponent(projectId)}/sprints`)}`;
    const perPage = clampPerPage(opts.perPage ?? 50);
    const page = Math.max(1, Math.floor(opts.page ?? 1));

    const query: Record<string, string | number | undefined | null> = {
        page,
        perPage,
        status: statusQueryValue(opts.status),
        name: opts.name ?? undefined,
    };

    const data = await request<unknown>(path, {
        method: "GET",
        query,
        signal: opts.signal,
    });
    return normalizeSprints(data);
}
