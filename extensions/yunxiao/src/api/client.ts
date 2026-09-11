/**
 * 云效 OpenAPI 客户端。
 *
 * - 基础 URL 与凭证统一由偏好解析器校验。
 * - 个人访问令牌通过 `x-yunxiao-token` 请求头传递。
 * - 不缓存任何响应；不在日志或错误中输出令牌。
 */

import { getPreferenceValues } from "@raycast/api";
import { parseCredentials, redactSensitiveText, type ResolvedCredentials } from "../utils/credentials";
import { NotFoundError, UnauthorizedError, YunxiaoApiError } from "./types";

export type { EndpointMode, ResolvedCredentials } from "../utils/credentials";
export { DEFAULT_BASE_URL } from "../utils/credentials";

/**
 * 按 mode + organizationId 构造 projex 命名空间的 path。
 *
 *  - central: /oapi/v1/projex/organizations/{orgId}/...
 *  - region : /oapi/v1/projex/...
 */
export function buildProjectPath(creds: ResolvedCredentials, suffix: string): string {
    if (creds.mode === "region") {
        return `/oapi/v1/projex/${suffix}`;
    }
    return `/oapi/v1/projex/organizations/${encodeURIComponent(creds.organizationId)}/${suffix}`;
}

/** 读取 Raycast 偏好并使用纯解析器进行统一校验。 */
export function resolveCredentials(): ResolvedCredentials {
    return parseCredentials(getPreferenceValues<Preferences>());
}

interface RequestOptions {
    method?: "GET" | "POST";
    /** Query 字符串参数；undefined 会被剔除 */
    query?: Record<string, string | number | undefined | null>;
    /** body 对象，自动序列化 JSON */
    body?: unknown;
    /** 信号量，用于列表主动放弃加载 */
    signal?: AbortSignal;
}

/** 分页响应头（x-page / x-per-page / x-total / x-next-page / x-total-pages）。 */
export interface PageHeaders {
    page?: number;
    perPage?: number;
    total?: number;
    nextPage?: number;
    totalPages?: number;
}

function parsePageHeaders(res: Response): PageHeaders {
    const num = (name: string): number | undefined => {
        const raw = res.headers.get(name);
        if (raw === null || raw === "") return undefined;
        const n = Number(raw);
        return Number.isFinite(n) ? n : undefined;
    };
    return {
        page: num("x-page"),
        perPage: num("x-per-page"),
        total: num("x-total"),
        nextPage: num("x-next-page"),
        totalPages: num("x-total-pages"),
    };
}

function buildQuery(query: RequestOptions["query"]): string {
    if (!query) return "";
    const parts: string[] = [];
    for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === "") continue;
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    return parts.length === 0 ? "" : `?${parts.join("&")}`;
}

async function requestCore(
    path: string,
    options: RequestOptions,
): Promise<{ res: Response; text: string; creds: ResolvedCredentials }> {
    const creds = resolveCredentials();
    const method = options.method ?? "GET";
    const url = `${creds.baseUrl}${path}${buildQuery(options.query)}`;
    const headers: Record<string, string> = {
        "x-yunxiao-token": creds.personalAccessToken,
        Accept: "application/json",
    };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(options.body);
    }
    if (options.signal) {
        init.signal = options.signal;
    }

    let res: Response;
    try {
        res = await fetch(url, init);
    } catch (err) {
        const msg = redactSensitiveText(err instanceof Error ? err.message : String(err), creds.personalAccessToken);
        throw new YunxiaoApiError(0, `网络错误：${msg}`, { url, method });
    }

    const text = redactSensitiveText(await res.text(), creds.personalAccessToken);
    if (res.status === 401) {
        throw new UnauthorizedError(text, url);
    }
    if (res.status === 404) {
        throw new NotFoundError(`资源不存在 (404)，请检查 baseUrl 与 organizationId：${path}`, text, url);
    }
    if (!res.ok) {
        const snippet = text ? text.slice(0, 200) : "(empty body)";
        const MAX_BODY_TEXT_LENGTH = 4000;
        const bodyText =
            text.length > MAX_BODY_TEXT_LENGTH ? text.slice(0, MAX_BODY_TEXT_LENGTH) + "\n…(已截断)" : text;
        throw new YunxiaoApiError(res.status, `云效 OpenAPI ${res.status}：${snippet}`, {
            bodyText,
            url,
            method,
        });
    }

    return { res, text, creds };
}

function parseBody<T>(text: string, res: Response, creds: ResolvedCredentials): T {
    if (!text) {
        return undefined as unknown as T;
    }
    try {
        return JSON.parse(text) as T;
    } catch (err) {
        const msg = redactSensitiveText(err instanceof Error ? err.message : String(err), creds.personalAccessToken);
        throw new YunxiaoApiError(res.status, `响应非 JSON：${msg}`);
    }
}

/** 通用请求封装。返回反序列化后的 JSON。 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { res, text, creds } = await requestCore(path, options);
    return parseBody<T>(text, res, creds);
}

/** 同 request，但同时返回分页响应头，用于翻页遍历。 */
export async function requestWithHeaders<T>(
    path: string,
    options: RequestOptions = {},
): Promise<{ data: T; headers: PageHeaders }> {
    const { res, text, creds } = await requestCore(path, options);
    return { data: parseBody<T>(text, res, creds), headers: parsePageHeaders(res) };
}

/**
 * 按响应头（x-next-page / x-total-pages）循环翻页，直到拉完全部数据。
 * 每页数组为空、缺少可判断分页的响应头，或达到 maxPages 时提前终止，避免死循环。
 */
export async function fetchAllPages<T>(
    fetchPage: (page: number) => Promise<{ items: T[]; headers: PageHeaders }>,
    opts: { maxPages?: number } = {},
): Promise<T[]> {
    const maxPages = opts.maxPages ?? 200;
    const all: T[] = [];
    let page = 1;
    for (let i = 0; i < maxPages; i++) {
        const { items, headers } = await fetchPage(page);
        all.push(...items);
        if (items.length === 0) break;
        const hasMore =
            headers.nextPage !== undefined
                ? headers.nextPage > page
                : headers.totalPages !== undefined
                  ? page < headers.totalPages
                  : false;
        if (!hasMore) break;
        page = headers.nextPage ?? page + 1;
    }
    return all;
}
