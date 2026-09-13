/**
 * 迭代（Sprint）响应归一化（无 @raycast/api 依赖，可独立测试）。
 *
 * 官方 ListSprints 文档化字段：
 *   id / name / status / startDate / endDate / capacityHours / description /
 *   gmtCreate / gmtModified / locked / creator{id,name} /
 *   modifier{id,name} / owners[{id,name}]
 *
 * 兼容裸数组与 { result / data } 包裹结构；非对象行 / 缺 id 的行直接跳过。
 */

import type { Sprint, SprintUserRef } from "./types";

function stringValue(value: unknown): string | undefined {
    return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function numberValue(value: unknown): number | undefined {
    return typeof value === "number"
        ? value
        : typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))
          ? Number(value)
          : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        const lower = value.toLowerCase();
        if (lower === "true" || lower === "1") return true;
        if (lower === "false" || lower === "0") return false;
    }
    return undefined;
}

function userRef(value: unknown): SprintUserRef | undefined {
    if (!value || typeof value !== "object") return undefined;
    const obj = value as Record<string, unknown>;
    const id = stringValue(obj.id);
    const name = stringValue(obj.name);
    if (id === undefined && name === undefined) return undefined;
    return { id, name };
}

function userRefList(value: unknown): SprintUserRef[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const list = value.map((entry) => userRef(entry)).filter((entry): entry is SprintUserRef => entry !== undefined);
    return list.length > 0 ? list : undefined;
}

export function normalizeSprints(response: unknown): Sprint[] {
    let rows: unknown[];
    if (Array.isArray(response)) {
        rows = response;
    } else if (response && typeof response === "object") {
        const value = response as { result?: unknown[]; data?: unknown[] };
        rows = value.result ?? value.data ?? [];
    } else {
        rows = [];
    }

    const result: Sprint[] = [];
    for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const value = row as Record<string, unknown>;
        const id = stringValue(value.id);
        if (!id) continue;

        result.push({
            id,
            name: stringValue(value.name),
            status: stringValue(value.status),
            startDate: stringValue(value.startDate),
            endDate: stringValue(value.endDate),
            capacityHours: numberValue(value.capacityHours),
            description: stringValue(value.description),
            createdAt: stringValue(value.gmtCreate),
            updatedAt: stringValue(value.gmtModified),
            locked: booleanValue(value.locked),
            creator: userRef(value.creator),
            modifier: userRef(value.modifier),
            owners: userRefList(value.owners),
        });
    }
    return result;
}
