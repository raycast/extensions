export const YUNXIAO_WEB_ROOT = "https://devops.aliyun.com";

export const WORKITEM_VIEW_ID = "b3d95a58f1270afe4d4c7ae746";

export type WorkitemUrlCategory = "Req" | "Bug" | "Task" | "Risk" | "Request" | "Topic";
export type ProjectCategoryPath = "req" | "bug" | "task" | "risk" | "request" | "topic";

const WORKITEM_CATEGORY_PATHS: Record<WorkitemUrlCategory, ProjectCategoryPath> = {
    Req: "req",
    Bug: "bug",
    Task: "task",
    Risk: "risk",
    Request: "request",
    Topic: "topic",
};

function segment(value: string): string {
    return encodeURIComponent(value);
}

export function projectUrl(projectId: string): string {
    return `${YUNXIAO_WEB_ROOT}/projex/project/${segment(projectId)}`;
}

export function projectCategoryUrl(projectId: string, category: ProjectCategoryPath): string {
    return `${projectUrl(projectId)}/${category}`;
}

export function projectWorkitemsUrl(projectId: string): string {
    return `${projectUrl(projectId)}/workitem#viewIdentifier=${WORKITEM_VIEW_ID}`;
}

export function workitemUrl(
    projectId: string | null | undefined,
    category: string | null | undefined,
    workitemId: string | null | undefined,
): string | undefined {
    const normalizedProjectId = projectId?.trim();
    const normalizedWorkitemId = workitemId?.trim();
    const type = category ? WORKITEM_CATEGORY_PATHS[category as WorkitemUrlCategory] : undefined;
    if (!normalizedProjectId || !normalizedWorkitemId || !type) return undefined;
    return `${projectUrl(normalizedProjectId)}/${type}/${segment(normalizedWorkitemId)}`;
}

export function sprintBacklogUrl(projectId: string): string {
    return `${projectUrl(projectId)}/sprint/backlog`;
}

export function sprintUrl(projectId: string, sprintId: string): string {
    return `${projectUrl(projectId)}/sprint/${segment(sprintId)}`;
}

export function testPlanListUrl(projectId: string): string {
    return `${projectUrl(projectId)}/testplan`;
}

export function testPlanUrl(planId: string): string {
    return `${YUNXIAO_WEB_ROOT}/testhub/plan/${segment(planId)}/dashboard`;
}

export function organizationAdminUrl(organizationId: string): string {
    return `${YUNXIAO_WEB_ROOT}/org-admin/${segment(organizationId)}/members/member`;
}

export const CODEUP_WEB_ROOT = "https://codeup.aliyun.com";

/** 允许的 Codeup 浏览器主机集合，API 返回的 webUrl/detailUrl 必须落在这些主机内 */
export const CODEUP_TRUSTED_HOSTS: ReadonlySet<string> = new Set(["codeup.aliyun.com"]);

/**
 * 校验 HTTPS URL 的 hosts allow-list；拒绝：
 *  - javascript: / data: / http: 等非 https scheme
 *  - 包含用户名/密码的 URL
 *  - hosts 不在 allow-list 内
 */
export function safeHttpsUrl(
    value: string | null | undefined,
    allowedHosts: ReadonlySet<string> = CODEUP_TRUSTED_HOSTS,
): string | undefined {
    if (!value) return undefined;
    try {
        const url = new URL(value);
        if (url.protocol !== "https:") return undefined;
        if (url.username || url.password) return undefined;
        if (!allowedHosts.has(url.hostname.toLowerCase())) return undefined;
        return url.href;
    } catch {
        return undefined;
    }
}

/** 把 URL 的敏感字段抹掉，只保留 host + path；用于错误诊断里复制 URL */
export function diagnosticUrl(value: string | null | undefined): string {
    if (!value) return "(URL unavailable)";
    try {
        const url = new URL(value);
        url.username = "";
        url.password = "";
        url.search = "";
        url.hash = "";
        if (url.protocol !== "https:") return "(URL unavailable)";
        return `${url.origin}${url.pathname}`;
    } catch {
        return "(invalid URL)";
    }
}

export function codeupMineUrl(): string {
    return `${CODEUP_WEB_ROOT}/?navKey=mine`;
}

export function codeupGroupsUrl(): string {
    return `${CODEUP_WEB_ROOT}/groups?navKey=mine`;
}

export function codeupChangesUrl(): string {
    return `${CODEUP_WEB_ROOT}/changes?navKey=all&search=created`;
}

/** 把仓库命名空间（org/repo）拆段并去掉 `.` `..` 空段 */
function encodedPathSegments(path: string): string | undefined {
    const parts = path.split("/").filter((part) => part.length > 0);
    if (parts.length === 0) return undefined;
    if (parts.some((part) => part === "." || part === "..")) return undefined;
    return parts.map(segment).join("/");
}

export function codeupRepositoryFallbackUrl(path: string | null | undefined): string | undefined {
    const normalized = path?.trim();
    if (!normalized) return undefined;
    const encoded = encodedPathSegments(normalized);
    if (!encoded) return undefined;
    return `${CODEUP_WEB_ROOT}/${encoded}`;
}

export function codeupMergeRequestFallbackUrl(
    repositoryPath: string | null | undefined,
    localId: string | number | null | undefined,
): string | undefined {
    const repository = repositoryPath?.trim();
    if (!repository) return undefined;
    const encodedRepo = encodedPathSegments(repository);
    if (!encodedRepo) return undefined;
    const rawId = localId === null || localId === undefined ? "" : String(localId).trim();
    if (!/^\d+$/.test(rawId)) return undefined;
    return `${CODEUP_WEB_ROOT}/${encodedRepo}/change/${segment(rawId)}`;
}
