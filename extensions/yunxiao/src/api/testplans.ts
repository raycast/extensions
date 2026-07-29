/**
 * 云效测试计划（Test Plan）相关接口。
 *
 * 官方文档：https://help.aliyun.com/zh/yunxiao/developer-reference/listtestplan-get-a-list-of-test-plans
 *
 * 端点：
 *   POST /oapi/v1/projex/organizations/{organizationId}/testPlan/list    (central)
 *   POST /oapi/v1/projex/testPlan/list                                   (region)
 * 鉴权：x-yunxiao-token
 *
 * 参数通过 query 传递（page / perPage / sprintIdentifier / projectIdentifier / status / name），
 * 即便使用 POST 方法 body 也是空的。
 *
 * 响应是裸数组 [TestPlan, ...]，字段包括 testPlanIdentifier / name / status /
 * gmtCreate / managers / spaceIdentifier；实际响应还可能携带起止时间字段
 * （gmtStart/gmtEnd 等多种命名），由 normalize 层归一化。
 * 分页信息通过响应头（x-page、x-per-page、x-total、x-next-page、x-total-pages）携带。
 *
 * 状态过滤值：TODO / DOING / DONE（多选用逗号分隔，如 DOING,DONE）。
 */

import { buildProjectPath, resolveCredentials, request } from "./client";
import { normalizeTestPlans } from "./testplans-normalize";
import type { TestPlan } from "./types";

export { normalizeTestPlans };

/** 官方支持的状态枚举。 */
export type TestPlanStatus = "TODO" | "DOING" | "DONE";

export interface ListTestPlansOptions {
    /** 项目 id（用于构造 projectIdentifier 查询参数） */
    projectId?: string | null;
    /** 迭代 id（与 projectId 同时传入会校验归属） */
    sprintIdentifier?: string | null;
    /** 每页大小，默认 200，上限 1000 */
    perPage?: number;
    /** 页码，从 1 开始，默认 1 */
    page?: number;
    /** 状态过滤；多选用逗号分隔；不传则拉全部 */
    status?: TestPlanStatus | TestPlanStatus[] | null;
    /** 名称模糊匹配 */
    name?: string | null;
    signal?: AbortSignal;
}

function clampPerPage(n: number): number {
    if (!Number.isFinite(n)) return 200;
    return Math.min(1000, Math.max(1, Math.floor(n)));
}

function statusQueryValue(status: TestPlanStatus | TestPlanStatus[] | null | undefined): string | undefined {
    if (!status) return undefined;
    if (Array.isArray(status)) {
        const filtered = status.filter((value): value is TestPlanStatus => Boolean(value));
        return filtered.length > 0 ? filtered.join(",") : undefined;
    }
    return status;
}

/**
 * 列出测试计划。
 *
 * 默认每页 200 条（官方上限 1000）。常规组织一次拉完即覆盖。
 * 如需分页可显式传 perPage / page。
 */
export async function listTestPlans(opts: ListTestPlansOptions = {}): Promise<TestPlan[]> {
    const creds = resolveCredentials();
    const path = buildProjectPath(creds, "testPlan/list");
    const perPage = clampPerPage(opts.perPage ?? 200);
    const page = Math.max(1, Math.floor(opts.page ?? 1));

    const query: Record<string, string | number | undefined | null> = {
        page,
        perPage,
        sprintIdentifier: opts.sprintIdentifier ?? undefined,
        projectIdentifier: opts.projectId ?? undefined,
        status: statusQueryValue(opts.status),
        name: opts.name ?? undefined,
    };

    const data = await request<unknown>(path, {
        method: "POST",
        query,
        signal: opts.signal,
    });
    return normalizeTestPlans(data);
}
