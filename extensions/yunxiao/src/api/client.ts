/**
 * 云效 OpenAPI 客户端。
 *
 * - 基础 URL 与凭证统一由偏好解析器校验。
 * - 个人访问令牌通过 `x-yunxiao-token` 请求头传递。
 * - 不缓存任何响应；不在日志或错误中输出令牌。
 */

import { getPreferenceValues } from "@raycast/api";
import {
    type CredentialPreferences,
    parseCredentials,
    redactSensitiveText,
    type ResolvedCredentials,
} from "../utils/credentials";
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
    return parseCredentials(getPreferenceValues<CredentialPreferences>());
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

function buildQuery(query: RequestOptions["query"]): string {
    if (!query) return "";
    const parts: string[] = [];
    for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === "") continue;
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    return parts.length === 0 ? "" : `?${parts.join("&")}`;
}

/** 通用请求封装。返回反序列化后的 JSON。 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
        throw new YunxiaoApiError(res.status, `云效 OpenAPI ${res.status}：${snippet}`, {
            bodyText: text,
            url,
            method,
        });
    }

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
