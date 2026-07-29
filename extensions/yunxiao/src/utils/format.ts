/**
 * 视图层格式化助手。
 */

import type { Workitem, WorkitemCategory, WorkitemPriorityRef, WorkitemStatusRef } from "../api/types";

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

export function statusLabel(s: WorkitemStatusRef | undefined): string {
    if (!s) return "-";
    return s.name ?? s.id ?? "-";
}

export function priorityLabel(p: WorkitemPriorityRef | undefined): string {
    if (!p) return "-";
    return p.name ?? (p.level !== undefined ? `P${p.level}` : "-");
}

function escapeMarkdown(s: string | undefined): string {
    if (!s) return "";
    // Raycast markdown 是 github 风味的；保留换行
    return s.replace(/\r/g, "");
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
    const d = new Date(Number(raw));
    if (Number.isNaN(d.getTime())) return raw;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/**
 * 把工作项渲染为 GitHub-flavoured Markdown，用于 Detail 视图。
 */
export function renderWorkitemMarkdown(w: Workitem): string {
    const lines: string[] = [];
    const title = w.subject ?? "(无标题)";
    lines.push(`# ${escapeMarkdown(title)}`);
    if (w.identifier) lines.push(`> \`${escapeMarkdown(w.identifier)}\``);
    lines.push("");

    const rows: Array<[string, string]> = [
        ["类别", categoryLabel(w.category)],
        ["状态", statusLabel(w.status)],
        ["优先级", priorityLabel(w.priority)],
        ["负责人", w.assignee?.name ?? w.assignee?.id ?? "未指派"],
        ["创建人", w.creator?.name ?? w.creator?.id ?? "-"],
        ["更新时间", w.updatedAt ?? "-"],
        ["项目 ID", w.projectId ?? "-"],
        ["工作项 ID", w.id ?? "-"],
    ];
    lines.push("| 字段 | 值 |");
    lines.push("| ---- | --- |");
    for (const [k, v] of rows) {
        lines.push(`| ${k} | ${escapeMarkdown(v)} |`);
    }
    lines.push("");
    lines.push("## 描述");
    lines.push(escapeMarkdown(w.description) || "_(无描述)_");
    return lines.join("\n");
}
