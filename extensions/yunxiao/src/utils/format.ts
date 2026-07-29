/**
 * 视图层格式化助手。
 */

import type { WorkitemCategory } from "../api/types";

export function categoryLabel(c: WorkitemCategory | string | undefined): string {
    switch (c) {
        case "Req":
            return "需求";
        case "Bug":
            return "缺陷";
        case "Task":
            return "任务";
        case "Risk":
            return "风险";
        case "Request":
            return "原始诉求";
        case "Topic":
            return "主题";
        default:
            return c ?? "-";
    }
}

/**
 * 把任意日期字符串规范化为 YYYY-MM-DD 形式。
 * - 空值原样返回 "-"；
 * - 已是 `YYYY-MM-DD...`（ISO 等）开头的，直接截前 10 位，避免时区漂移；
 * - 其它可被 Date 解析的格式（含时间戳、"yyyy/M/d" 等），按本地时区格式化；
 * - 解析失败时回退到原值，便于排查脏数据。
 */
export function formatDateYMD(value: string | number | undefined | null): string {
    if (value === undefined || value === null || value === "") return "-";
    const raw = typeof value === "number" ? String(value) : value;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const d = new Date(typeof value === "number" ? value : raw);
    if (Number.isNaN(d.getTime())) return raw;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
