/**
 * 统一的 API 错误详情格式化，供各 list-* 命令的 EmptyView / 「复制错误详情」使用。
 * 各调用方只需提供各自的排查建议文案（hints）与默认 HTTP method。
 */

import { resolveCredentials } from "../api/client";

export interface ErrorDetails {
    /** 一行短原因，给 toast 和 EmptyView 用 */
    brief: string;
    /** 完整诊断信息（URL、状态码、响应体），给复制用 */
    details: string;
}

export interface ToErrorDetailsOptions {
    /** 未捕获到 method 时的默认值 */
    defaultMethod?: string;
    /** 排查建议文案，按顺序列出 */
    hints: string[];
    /** 请求 URL 展示前的处理（例如脱敏 organizationId），缺省原样展示 */
    formatUrl?: (url: string | undefined) => string;
    /** 是否附带 baseUrl / mode / organizationId 等凭证上下文 */
    includeCredentialsContext?: boolean;
}

export function toErrorDetails(err: unknown, options: ToErrorDetailsOptions): ErrorDetails {
    const msg = err instanceof Error ? err.message : String(err);
    const anyErr = err as { status?: number; bodyText?: string; name?: string; url?: string; method?: string };
    const status = anyErr?.status;
    const body = anyErr?.bodyText ?? "";
    const url = anyErr?.url;
    const method = anyErr?.method ?? options.defaultMethod ?? "GET";
    const firstLine = msg.split("\n")[0] || "未知错误";
    const brief = typeof status === "number" && status > 0 ? `${status} · ${firstLine}` : firstLine;

    const lines: string[] = [];
    lines.push(`时间: ${new Date().toISOString()}`);
    if (options.includeCredentialsContext) {
        try {
            const creds = resolveCredentials();
            if (creds) {
                lines.push(`baseUrl: ${creds.baseUrl}`);
                lines.push(`mode: ${creds.mode}`);
                lines.push(`organizationId: ${creds.organizationId}`);
            }
        } catch {
            /* ignore */
        }
    }
    const displayedUrl = options.formatUrl ? options.formatUrl(url) : (url ?? "(URL 未捕获)");
    lines.push(`request: ${method} ${displayedUrl}`);
    if (typeof status === "number") lines.push(`status: ${status}`);
    lines.push(`name: ${anyErr?.name ?? "Error"}`);
    lines.push(`message: ${msg}`);
    if (body) {
        lines.push(`response body:`);
        lines.push(body.length > 4000 ? body.slice(0, 4000) + "\n…(已截断)" : body);
    }
    lines.push("");
    lines.push("排查建议:");
    options.hints.forEach((hint, index) => lines.push(`${index + 1}. ${hint}`));
    return { brief, details: lines.join("\n") };
}
