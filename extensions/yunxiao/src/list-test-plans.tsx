/**
 * 测试计划列表命令（list-test-plans）。
 *
 * 进入命令后直接展示当前组织下所有可见的测试计划（在前后端都不过滤项目）；
 * 用户可在搜索栏右侧的下拉里按「状态」进一步筛选。
 *
 * 项目列表与测试计划列表是两次独立的网络拉取：
 *   - 项目列表仅用于「项目 ID → 项目名」映射，用于在副标题里显示项目名；拉取失败不影响主列表；
 *   - 测试计划列表是命令主体，使用当前状态过滤调用 `listTestPlans`。
 *
 * 错误展示策略与 `list-projects.tsx` / `list-repositories.tsx` 一致：
 * toast 只显示一行短因，详情保留在 EmptyView + 「复制错误详情」动作里。
 */

import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { resolveCredentials } from "./api/client";
import { listProjects } from "./api/projects";
import { listTestPlans, type TestPlanStatus } from "./api/testplans";
import type { Project, TestPlan } from "./api/types";
import { testPlanUrl } from "./utils/urls";
import { formatDateYMD } from "./utils/format";

interface ErrorDetails {
    brief: string;
    details: string;
}

function toErrorDetails(err: unknown): ErrorDetails {
    const msg = err instanceof Error ? err.message : String(err);
    const anyErr = err as { status?: number; bodyText?: string; name?: string; url?: string; method?: string };
    const status = anyErr?.status;
    const body = anyErr?.bodyText ?? "";
    const url = anyErr?.url;
    const method = anyErr?.method ?? "POST";
    const firstLine = msg.split("\n")[0] || "未知错误";
    const brief = typeof status === "number" && status > 0 ? `${status} · ${firstLine}` : firstLine;
    const lines: string[] = [];
    lines.push(`时间: ${new Date().toISOString()}`);
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
    lines.push(`request: ${method} ${url ?? "(URL 未捕获)"}`);
    if (typeof status === "number") lines.push(`status: ${status}`);
    lines.push(`name: ${anyErr?.name ?? "Error"}`);
    lines.push(`message: ${msg}`);
    if (body) {
        lines.push(`response body:`);
        lines.push(body.length > 4000 ? body.slice(0, 4000) + "\n…(已截断)" : body);
    }
    lines.push("");
    lines.push("排查建议:");
    lines.push("1. 偏好里 Personal Access Token 是否勾选了「测试管理 / 测试计划 / 只读」？");
    lines.push("2. Organization Id 是否与浏览器登录后 URL 中的一致？");
    lines.push("3. 接入点模式是否选对：默认中心版（openapi-rdc.aliyuncs.com），Region 版需要填自部署 URL；");
    lines.push("   Region 版请求 path 不带 organizations/{organizationId}/ 段。");
    lines.push("4. 把上面的 request 行复制到终端，用 curl 加 x-yunxiao-token 头直连，看返回。");
    return { brief, details: lines.join("\n") };
}

const STATUS_ALL = "ALL";

const STATUS_OPTIONS: { value: TestPlanStatus | typeof STATUS_ALL; title: string }[] = [
    { value: STATUS_ALL, title: "全部状态" },
    { value: "TODO", title: "未开始" },
    { value: "DOING", title: "进行中" },
    { value: "DONE", title: "已完成" },
];

function statusFilterValue(value: TestPlanStatus | typeof STATUS_ALL): TestPlanStatus | undefined {
    return value === STATUS_ALL ? undefined : value;
}

function statusTitle(value: string | undefined): string {
    switch (value) {
        case "TODO":
            return "未开始";
        case "DOING":
            return "进行中";
        case "DONE":
            return "已完成";
        default:
            return value ?? "-";
    }
}

/** "开始 - 结束"；任一缺失时回退到另一个或创建时间，最后降级为 "-" */
function planTimeRange(plan: TestPlan): string {
    // 注意：formatDateYMD 对空值返回字符串 "-"，不能用 truthy 判断是否有日期。
    const hasStart = Boolean(plan.startTime);
    const hasEnd = Boolean(plan.endTime);
    const start = formatDateYMD(plan.startTime);
    const end = formatDateYMD(plan.endTime);
    if (hasStart && hasEnd) return `${start} - ${end}`;
    if (hasStart) return `${start} -`;
    if (hasEnd) return `- ${end}`;
    return formatDateYMD(plan.createdAt);
}

function projectDisplayName(project: Project | undefined): string | undefined {
    if (!project) return undefined;
    return project.name ?? project.identifier ?? project.id;
}

export default function ListTestPlans() {
    const [plans, setPlans] = useState<TestPlan[] | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);

    const [plansError, setPlansError] = useState<ErrorDetails>();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<TestPlanStatus | typeof STATUS_ALL>("DOING");
    const [reloadKey, setReloadKey] = useState(0);

    // 项目列表仅用于「项目 ID → 项目名」映射，不阻塞测试计划列表的展示
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const items = await listProjects({ perPage: 200 });
                if (cancelled) return;
                setProjects(items);
            } catch {
                if (cancelled) return;
                /* 项目名缺失只影响副标题展示，不阻断主流程 */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // 测试计划列表：状态过滤变化时重新拉取；命令始终展示全组织可见的测试计划
    useEffect(() => {
        const controller = new AbortController();
        setPlans(null);
        setPlansError(undefined);
        void listTestPlans({
            status: statusFilterValue(statusFilter),
            signal: controller.signal,
        })
            .then((items) => {
                if (controller.signal.aborted) return;
                setPlans(items);
            })
            .catch(async (reason) => {
                if (controller.signal.aborted) return;
                const { brief, details } = toErrorDetails(reason);
                const next: ErrorDetails = { brief, details };
                setPlansError(next);
                await showToast({ style: Toast.Style.Failure, title: "加载测试计划失败", message: brief });
            });
        return () => controller.abort();
    }, [statusFilter, reloadKey]);

    const projectIndex = useMemo(() => {
        const map = new Map<string, Project>();
        for (const project of projects) map.set(project.id, project);
        return map;
    }, [projects]);

    const normalized = search.trim().toLocaleLowerCase();
    const filtered = useMemo(() => {
        const rows = plans ?? [];
        if (!normalized) return rows;
        return rows.filter((plan) => {
            const projectName = plan.projectId ? projectDisplayName(projectIndex.get(plan.projectId)) : undefined;
            const haystack = [plan.name, plan.id, plan.status, plan.projectId, plan.ownerId, projectName]
                .filter((value): value is string => Boolean(value))
                .map((value) => value.toLocaleLowerCase());
            return haystack.some((value) => value.includes(normalized));
        });
    }, [plans, normalized, projectIndex]);

    function reload() {
        setReloadKey((value) => value + 1);
    }

    const isLoading = plans === null && !plansError;

    return (
        <List
            isLoading={isLoading}
            filtering={false}
            onSearchTextChange={setSearch}
            searchBarPlaceholder={`搜索测试计划…`}
            searchBarAccessory={
                <List.Dropdown
                    tooltip="状态过滤"
                    storeValue={true}
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value as TestPlanStatus | typeof STATUS_ALL)}
                >
                    {STATUS_OPTIONS.map((statusOption) => (
                        <List.Dropdown.Item
                            key={statusOption.value}
                            value={statusOption.value}
                            title={statusOption.title}
                        />
                    ))}
                </List.Dropdown>
            }
        >
            <List.EmptyView
                icon={plansError ? Icon.ExclamationMark : Icon.Bug}
                title={
                    plansError
                        ? "无法加载测试计划"
                        : filtered.length === 0 && plans?.length
                          ? "没有匹配项"
                          : isLoading
                            ? "加载测试计划…"
                            : "暂无测试计划"
                }
                description={
                    plansError?.brief ??
                    (filtered.length === 0 && plans?.length
                        ? "尝试切换状态过滤或换个搜索关键词。"
                        : "在 Testhub 创建测试计划后回来查看。")
                }
                actions={
                    plansError?.details ? (
                        <ActionPanel>
                            <Action title="重新加载" icon={Icon.ArrowClockwise} onAction={reload} />
                            <Action.CopyToClipboard
                                title="复制错误详情"
                                content={plansError.details}
                                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                            />
                        </ActionPanel>
                    ) : undefined
                }
            />
            {filtered.map((plan) => {
                const projectName = plan.projectId ? projectDisplayName(projectIndex.get(plan.projectId)) : undefined;
                const subtitleParts: string[] = [];
                if (projectName) subtitleParts.push(projectName);
                const accessories: Array<{ tag?: string; text?: string }> = [{ tag: statusTitle(plan.status) }];
                accessories.push({ text: planTimeRange(plan) });
                return (
                    <List.Item
                        key={plan.id}
                        icon={Icon.Bug}
                        title={plan.name || `(未命名) ${plan.id}`}
                        subtitle={subtitleParts.join(" · ")}
                        accessories={accessories}
                        actions={
                            <ActionPanel>
                                <Action.OpenInBrowser title="在 Testhub 中打开" url={testPlanUrl(plan.id)} />
                                <Action.CopyToClipboard title="复制计划 ID" content={plan.id} />
                            </ActionPanel>
                        }
                    />
                );
            })}
        </List>
    );
}
