/**
 * 云效项目相关接口。
 * 官方文档：https://help.aliyun.com/zh/yunxiao/developer-reference/searchprojects
 *
 * 列出项目走的是 POST `:search` 动作：
 *   POST /oapi/v1/projex/organizations/{organizationId}/projects:search
 * 鉴权使用 `x-yunxiao-token`（个人访问令牌），响应是裸数组，分页走响应头
 * （x-page、x-per-page、x-total、x-next-page）。
 */

import { buildProjectPath, resolveCredentials, request } from "./client";
import type { Project } from "./types";

export interface ListProjectsOptions {
    /** 每页大小，默认 50 */
    perPage?: number;
    /** 页码，从 1 开始，默认 1 */
    page?: number;
    /** 关键字过滤（按 name 模糊匹配） */
    keyword?: string;
    signal?: AbortSignal;
}

/**
 * 列出当前 organization 下的项目。
 *
 * SearchProjects 返回裸数组 [Project,...]，无需 .items / .projects 包装。
 */
export async function listProjects(opts: ListProjectsOptions = {}): Promise<Project[]> {
    const creds = resolveCredentials();

    const path = buildProjectPath(creds, "projects:search");
    const perPage = clampPerPage(opts.perPage ?? 50);
    const page = Math.max(1, Math.floor(opts.page ?? 1));

    // 构造 conditions：如果给了 keyword，按 name 模糊匹配
    const conditions: Array<Array<unknown>> = [];
    if (opts.keyword && opts.keyword.trim()) {
        conditions.push([
            {
                className: "string",
                fieldIdentifier: "name",
                format: "input",
                operator: "CONTAINS",
                value: opts.keyword.trim(),
            },
        ]);
    }
    const body: Record<string, unknown> = {
        page,
        perPage,
        orderBy: "gmtCreate",
        sort: "desc",
    };
    if (conditions.length > 0) {
        body.conditions = JSON.stringify({ conditionGroups: conditions });
    }

    const data = await request<Project[]>(path, {
        method: "POST",
        body,
        signal: opts.signal,
    });
    // SearchProjects 返回裸数组
    return Array.isArray(data) ? data : [];
}

function clampPerPage(n: number): number {
    if (!Number.isFinite(n)) return 50;
    return Math.min(200, Math.max(1, Math.floor(n)));
}
