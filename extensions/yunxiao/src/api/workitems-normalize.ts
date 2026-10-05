/**
 * 工作项（Workitem）响应归一化（无 @raycast/api 依赖，可独立测试）。
 *
 * 官方 SearchWorkitems 的请求参数叫 `category`，但**响应字段叫 `categoryId`**，
 * 取值同为 "Req" / "Bug" / "Task" / "Risk" / "Request" / "Topic"。
 * 视图层统一读 `category`，这里把 categoryId 归一化过去，
 * 否则 category 恒为 undefined，workitemUrl 拿不到类型、无法拼出详情地址。
 *
 * 文档：https://help.aliyun.com/zh/yunxiao/developer-reference/searchworkitems
 *
 * 同时兼容裸数组与 { result / data } 包裹结构；非对象行 / 缺 id 的行直接跳过。
 */

import type { Workitem, WorkitemCategory } from "./types";

/**
 * 官方工作项大类型枚举。
 *
 * 这里本地声明而非从 ./types 引入运行时常量，是为了让本模块保持「只有 type 导入」，
 * 与其余 *-normalize.ts 一致，可在测试里直接 import 而不牵扯 @raycast/api 依赖链。
 * 取值与 types.ts 的 WORKITEM_CATEGORIES 一致，由下方类型断言保证不漂移。
 */
const CATEGORY_VALUES = ["Req", "Bug", "Task", "Risk", "Request", "Topic"] as const;
// 编译期校验：本地枚举必须覆盖 WorkitemCategory 的全部取值。
const _exhaustive: readonly WorkitemCategory[] = CATEGORY_VALUES;
void _exhaustive;

function stringValue(value: unknown): string | undefined {
    return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

/** 只接受官方枚举值，避免把脏数据拼进 URL 路径。 */
function categoryValue(...candidates: unknown[]): WorkitemCategory | undefined {
    for (const candidate of candidates) {
        const value = stringValue(candidate);
        if (value && (CATEGORY_VALUES as readonly string[]).includes(value)) {
            return value as WorkitemCategory;
        }
    }
    return undefined;
}

export function normalizeWorkitems(response: unknown): Workitem[] {
    let rows: unknown[];
    if (Array.isArray(response)) {
        rows = response;
    } else if (response && typeof response === "object") {
        const value = response as { result?: unknown[]; data?: unknown[] };
        rows = value.result ?? value.data ?? [];
    } else {
        rows = [];
    }

    const result: Workitem[] = [];
    for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const value = row as Record<string, unknown>;
        const id = stringValue(value.id);
        if (!id) continue;

        result.push({
            ...(value as unknown as Workitem),
            id,
            // 响应里是 categoryId；旧字段 category 若存在则优先，便于兼容不同版本。
            category: categoryValue(value.category, value.categoryId),
        });
    }
    return result;
}
