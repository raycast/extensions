/**
 * 云效工作项相关接口。
 * 官方文档：
 *   - SearchWorkitems: https://help.aliyun.com/zh/yunxiao/developer-reference/searchworkitems
 *   - GetWorkitem:     https://help.aliyun.com/zh/yunxiao/developer-reference/getworkitem
 *
 * 中心版统一接入域名：https://openapi-rdc.aliyuncs.com
 * 列工作项走 POST `:search`，单条走 GET + spaceId 查询参数。
 */

import { buildProjectPath, resolveCredentials, request } from "./client";
import { WORKITEM_CATEGORIES, type PaginatedResult, type Workitem, type WorkitemCategory } from "./types";

const MAX_RESULTS = 50;

export interface ListWorkitemsOptions {
    projectId?: string | null;
    /** 工作项大类型。"All" / 空值 / undefined 时，一次性传入全部 6 类作为多值参数。 */
    category?: WorkitemCategory | "All" | null;
    /** 分页，从 1 开始，默认 1 */
    page?: number;
    /** 每页大小，默认 50 */
    perPage?: number;
    signal?: AbortSignal;
}

/**
 * 列出项目下的工作项。
 *
 * SearchWorkitems 返回裸数组；category 多值用逗号分隔。
 * 「全部」直接传 `Req,Bug,Task,Risk,Request,Topic`，避免 API 报「工作项类型不能为空」400。
 */
export async function listWorkitems(opts: ListWorkitemsOptions): Promise<PaginatedResult<Workitem>> {
    const creds = resolveCredentials();
    const projectId = (opts.projectId ?? "").trim();
    if (!projectId) {
        throw new Error("缺少 projectId（spaceId）。请在扩展命令参数或表单中提供。");
    }

    const perPage = clampPerPage(opts.perPage ?? MAX_RESULTS);
    const page = Math.max(1, Math.floor(opts.page ?? 1));
    // 「全部」/未指定类别时按官方支持的多值语法一次性传入，避免 API 报「工作项类型不能为空」。
    const category = opts.category && opts.category !== "All" ? opts.category : WORKITEM_CATEGORIES.join(",");

    const path = buildProjectPath(creds, "workitems:search");
    const body: Record<string, unknown> = {
        spaceId: projectId,
        spaceType: "Project",
        page,
        perPage,
        conditions: JSON.stringify({
            conditionGroups: [
                [
                    {
                        fieldIdentifier: "statusStage",
                        operator: "CONTAINS",
                        value: ["1", "6", "2", "7", "11", "12", "13"],
                        toValue: null,
                        className: "statusStage",
                        format: "multiList",
                    },
                ],
            ],
        }),
        orderBy: "gmtCreate",
        sort: "desc",
    };
    if (category) body.category = category;

    const data = await request<Workitem[]>(path, {
        method: "POST",
        body,
        signal: opts.signal,
    });
    return {
        items: Array.isArray(data) ? data : [],
    };
}

/**
 * 拉取单个工作项详情。
 * 官方文档：/oapi/v1/projex/organizations/{organizationId}/workitems/{workitemId}?spaceId=...
 */
export async function getWorkitem(workitemId: string, projectId?: string): Promise<Workitem> {
    const creds = resolveCredentials();
    const id = (workitemId ?? "").trim();
    if (!id) throw new Error("缺少 workitemId。");

    const path = `${buildProjectPath(creds, `workitems/${encodeURIComponent(id)}`)}${
        projectId ? `?spaceId=${encodeURIComponent(projectId)}` : ""
    }`;

    // 详情接口直接返回对象（或对象包装），按需适配
    const data = await request<Workitem | { workitem?: Workitem }>(path);
    if (data && typeof data === "object" && "subject" in (data as object)) {
        return data as Workitem;
    }
    const wrapped = (data as { workitem?: Workitem })?.workitem;
    if (wrapped) return wrapped;
    throw new Error("工作项详情为空。");
}

function clampPerPage(n: number): number {
    if (!Number.isFinite(n)) return 50;
    return Math.min(200, Math.max(1, Math.floor(n)));
}
