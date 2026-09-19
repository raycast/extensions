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
 * 纯数字串按 Unix 时间戳解析，返回毫秒值；不是纯数字则返回 undefined。
 *
 * 云效部分接口（如 testPlan/list 的起止时间）返回的是数字型时间戳，
 * 经 normalize 层 String() 之后变成 "1788105600000" 这样的纯数字串，
 * 而 `new Date("1788105600000")` 是 Invalid Date——必须先转回 number。
 *
 * 10 位按秒、13 位及以上按毫秒；短数字（如 "2024"）不当作时间戳，
 * 交给 Date 按普通日期字符串解析。
 */
function epochToMillis(raw: string): number | undefined {
    if (!/^\d+$/.test(raw)) return undefined;
    if (raw.length === 10) return Number(raw) * 1000;
    if (raw.length >= 13) return Number(raw);
    return undefined;
}

/**
 * 把任意日期字符串规范化为 YYYY-MM-DD 形式。
 * - 空值原样返回 "-"；
 * - 已是 `YYYY-MM-DD...`（ISO 等）开头的，直接截前 10 位，避免时区漂移；
 * - 纯数字（number 或字符串形式的 Unix 时间戳，秒/毫秒）按时间戳解析；
 * - 其它可被 Date 解析的格式（如 "yyyy/M/d"），按本地时区格式化；
 * - 解析失败时回退到原值，便于排查脏数据。
 */
export function formatDateYMD(value: string | number | undefined | null): string {
    if (value === undefined || value === null || value === "") return "-";
    const raw = typeof value === "number" ? String(value) : value;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const d = new Date(typeof value === "number" ? value : (epochToMillis(raw) ?? raw));
    if (Number.isNaN(d.getTime())) return raw;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
