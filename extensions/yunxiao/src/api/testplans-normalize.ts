/**
 * 测试计划响应归一化（无 @raycast/api 依赖，可独立测试）。
 *
 * 官方 ListTestPlan 文档化字段：
 *   testPlanIdentifier / name / status / gmtCreate / managers / spaceIdentifier
 * 实际响应还可能携带起止时间字段（命名随版本不同而异），
 * 这里按优先级尝试 gmtStart → startTime → startDate → start，
 * 以及 gmtEnd → endTime → endDate → end，全部归一化为 ISO 字符串。
 *
 * 归一化到内部 TestPlan：
 *   testPlanIdentifier → id
 *   spaceIdentifier    → projectId
 *   managers[0]        → ownerId
 *   managers           → managerIds
 *   gmtCreate          → createdAt
 *   起止时间字段       → startTime / endTime
 *
 * 同时兼容裸数组与 { result / data } 包裹结构。
 */

import type { TestPlan } from "./types";

function stringValue(value: unknown): string | undefined {
    return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function firstString(...candidates: unknown[]): string | undefined {
    for (const candidate of candidates) {
        const value = stringValue(candidate);
        if (value) return value;
    }
    return undefined;
}

export function normalizeTestPlans(response: unknown): TestPlan[] {
    let rows: unknown[];
    if (Array.isArray(response)) {
        rows = response;
    } else if (response && typeof response === "object") {
        const value = response as { result?: unknown[]; data?: unknown[] };
        rows = value.result ?? value.data ?? [];
    } else {
        rows = [];
    }

    const result: TestPlan[] = [];
    for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const value = row as Record<string, unknown>;
        const identifier = stringValue(value.testPlanIdentifier ?? value.id);
        if (!identifier) continue;

        const managers = Array.isArray(value.managers)
            ? value.managers.filter((m): m is string => typeof m === "string" && m.length > 0)
            : [];
        const projectId = stringValue(value.spaceIdentifier);
        const name = stringValue(value.name);
        const status = stringValue(value.status);
        const createdAt = stringValue(value.gmtCreate);
        const startTime = firstString(value.gmtStart, value.startTime, value.startDate, value.start);
        const endTime = firstString(value.gmtEnd, value.endTime, value.endDate, value.end);

        result.push({
            id: identifier,
            name,
            status,
            projectId,
            ownerId: managers[0],
            managerIds: managers,
            createdAt,
            startTime,
            endTime,
        });
    }
    return result;
}
