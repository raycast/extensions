/**
 * 云效工作项相关接口。
 * 官方文档：
 *   - SearchWorkitems: https://help.aliyun.com/zh/yunxiao/developer-reference/searchworkitems
 *   - GetWorkitem:     https://help.aliyun.com/zh/yunxiao/developer-reference/getworkitem
 *
 * 中心版统一接入域名：https://openapi-rdc.aliyuncs.com
 * 列工作项走 POST `:search`，单条走 GET + spaceId 查询参数。
 */

import { buildProjectPath, fetchAllPages, resolveCredentials, requestWithHeaders } from "./client";
import { normalizeWorkitems } from "./workitems-normalize";
import { WORKITEM_CATEGORIES, type PaginatedResult, type Workitem, type WorkitemCategory } from "./types";

export { normalizeWorkitems };

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
 * 注意：请求参数叫 category，响应字段却叫 categoryId，由 normalize 层归一化。
 * 「全部」直接传 `Req,Bug,Task,Risk,Request,Topic`，避免 API 报「工作项类型不能为空」400。
 *
 * 未显式指定 page 时自动翻页拉取全部工作项，避免工作项数超过一页时后面的条目
 * 被静默丢弃；显式传 page 时仅拉取该页。
 */
export async function listWorkitems(opts: ListWorkitemsOptions): Promise<PaginatedResult<Workitem>> {
    const creds = resolveCredentials();
    const projectId = (opts.projectId ?? "").trim();
    if (!projectId) {
        throw new Error("缺少 projectId（spaceId）。请在扩展命令参数或表单中提供。");
    }

    const perPage = clampPerPage(opts.perPage ?? MAX_RESULTS);
    // 「全部」/未指定类别时按官方支持的多值语法一次性传入，避免 API 报「工作项类型不能为空」。
    const category = opts.category && opts.category !== "All" ? opts.category : WORKITEM_CATEGORIES.join(",");

    const path = buildProjectPath(creds, "workitems:search");
    const buildBody = (page: number): Record<string, unknown> => {
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
        return body;
    };

    if (opts.page !== undefined) {
        const page = Math.max(1, Math.floor(opts.page));
        const { data } = await requestWithHeaders<unknown>(path, {
            method: "POST",
            body: buildBody(page),
            signal: opts.signal,
        });
        return { items: normalizeWorkitems(data) };
    }

    const items = await fetchAllPages<Workitem>(async (page) => {
        const { data, headers } = await requestWithHeaders<unknown>(path, {
            method: "POST",
            body: buildBody(page),
            signal: opts.signal,
        });
        return { items: normalizeWorkitems(data), headers };
    });
    return { items };
}

function clampPerPage(n: number): number {
    if (!Number.isFinite(n)) return 50;
    return Math.min(200, Math.max(1, Math.floor(n)));
}
