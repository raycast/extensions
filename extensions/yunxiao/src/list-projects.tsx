/**
 * 项目列表命令（list-projects）。
 * 列出当前 organization 下可访问的项目；选择项目后操作可直达：
 *   - 工作项（拉取列表后再选择，跳详情）、迭代、测试计划、概览、各类别（需求/任务/缺陷/主题/原始诉求）
 *   - 查看迭代 / 查看测试计划 拉取列表后再跳链
 *
 * 错误展示策略：
 *  - toast 只显示一行状态码 + 简短原因，便于一眼看到
 *  - 详情（完整 URL、status、响应体）保留在 EmptyView 与 Action.CopyToClipboard
 */

import { Action, ActionPanel, Icon, List, Toast, showToast, useNavigation, Keyboard } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { resolveCredentials } from "./api/client";
import { listProjects } from "./api/projects";
import { searchSprints } from "./api/sprints";
import { listTestPlans } from "./api/testplans";
import {
    WORKITEM_CATEGORIES,
    type Project,
    type Sprint,
    type TestPlan,
    type Workitem,
    type WorkitemCategory,
} from "./api/types";
import { listWorkitems } from "./api/workitems";
import { categoryLabel, formatDateYMD } from "./utils/format";
import {
    projectCategoryUrl,
    projectUrl,
    projectWorkitemsUrl,
    sprintBacklogUrl,
    sprintUrl,
    testPlanListUrl,
    testPlanUrl,
    workitemUrl,
} from "./utils/urls";

const ALL_CATEGORY_VALUE = "All";
type CategoryFilter = WorkitemCategory | typeof ALL_CATEGORY_VALUE;

const CATEGORY_OPTIONS: { value: CategoryFilter; title: string }[] = [
    { value: ALL_CATEGORY_VALUE, title: "全部" },
    ...WORKITEM_CATEGORIES.map((category) => ({ value: category, title: categoryLabel(category) })),
];

function normalizeCategory(input: string | undefined): CategoryFilter {
    const normalized = input?.trim();
    if (normalized === ALL_CATEGORY_VALUE || WORKITEM_CATEGORIES.includes(normalized as WorkitemCategory)) {
        return normalized as CategoryFilter;
    }
    return ALL_CATEGORY_VALUE;
}

interface ErrorDetails {
    /** 一行短原因，给 toast 用 */
    brief: string;
    /** 完整诊断信息（URL、状态码、响应体），给详情面板与复制用 */
    details: string;
}

function toErrorDetails(err: unknown): ErrorDetails {
    const msg = err instanceof Error ? err.message : String(err);
    const anyErr = err as { status?: number; bodyText?: string; name?: string; url?: string; method?: string };
    const status = anyErr?.status;
    const body = anyErr?.bodyText ?? "";
    const url = anyErr?.url;
    const method = anyErr?.method ?? "GET";
    const brief =
        typeof status === "number" && status > 0
            ? `${status} · ${msg.split("\n")[0]}`
            : msg.split("\n")[0] || "未知错误";
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
    lines.push("1. 偏好里 Personal Access Token 是否勾选了『项目』读取权限？");
    lines.push("2. Organization Id 是否与浏览器登录后 URL 中的一致？");
    lines.push("3. 接入点模式是否选对：默认中心版（openapi-rdc.aliyuncs.com），Region 版需要填自部署 URL；");
    lines.push("   Region 版请求 path 不带 organizations/{organizationId}/ 段。");
    lines.push("4. 把上面的 request 行复制到终端，用 curl 加 x-yunxiao-token 头直连，看返回。");
    return { brief, details: lines.join("\n") };
}

/* ---------- Main command ---------- */

export default function ListProjects() {
    const { push } = useNavigation();
    const [projects, setProjects] = useState<Project[] | null>(null);
    const [error, setError] = useState<string | undefined>();
    const [errorDetails, setErrorDetails] = useState<string | undefined>();
    const [filter, setFilter] = useState("");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const items = await listProjects();
                if (!cancelled) {
                    setProjects(items);
                    if (items.length === 0) setError("没有可访问的项目。");
                }
            } catch (err) {
                if (!cancelled) {
                    const { brief, details } = toErrorDetails(err);
                    setError(brief);
                    setErrorDetails(details);
                    await showToast({ style: Toast.Style.Failure, title: "加载项目失败", message: brief });
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    async function showSprints(project: Project) {
        push(<SprintsView projectId={project.id} projectName={project.name ?? project.id} />);
    }

    function showTestPlans(project: Project) {
        push(<TestPlansView projectId={project.id} projectName={project.name ?? project.id} />);
    }

    function showWorkitems(project: Project) {
        push(<WorkitemsView projectId={project.id} projectName={project.name ?? project.id} />);
    }

    const items = projects ?? [];
    const normalizedFilter = filter.trim().toLocaleLowerCase();
    const filtered = normalizedFilter
        ? items.filter((project) =>
              [project.name, project.identifier]
                  .filter((value): value is string => Boolean(value))
                  .some((value) => value.toLocaleLowerCase().includes(normalizedFilter)),
          )
        : items;

    return (
        <List
            isLoading={projects === null && !error}
            filtering={false}
            onSearchTextChange={setFilter}
            searchBarPlaceholder="按项目名称或标识筛选…"
        >
            <List.EmptyView
                icon={error ? Icon.ExclamationMark : Icon.Folder}
                title={error ? "无法加载项目" : "暂无项目"}
                description={error ?? "先去 devops.aliyun.com 加入组织，再回来查看。"}
                actions={
                    error ? (
                        <ActionPanel>
                            {errorDetails ? (
                                <Action.CopyToClipboard
                                    title="复制错误详情"
                                    content={errorDetails}
                                    shortcut={Keyboard.Shortcut.Common.Copy}
                                />
                            ) : null}
                            <Action.CopyToClipboard
                                title="复制请求 URL 模板"
                                content={
                                    "POST {baseUrl}/oapi/v1/projex/organizations/{organizationId}/projects:search\n" +
                                    "Header: x-yunxiao-token: <PAT>\n" +
                                    'Body: { "page": 1, "perPage": 50, "orderBy": "gmtCreate", "sort": "desc" }'
                                }
                            />
                        </ActionPanel>
                    ) : undefined
                }
            />
            {filtered.map((p) => {
                const pid = p.id;
                return (
                    <List.Item
                        key={pid}
                        icon={Icon.Folder}
                        title={p.name ?? "(未命名项目)"}
                        subtitle={p.identifier ?? ""}
                        accessories={[{ tag: p.visibility ?? "-" }]}
                        actions={
                            <ActionPanel>
                                <Action title="查看工作项" icon={Icon.List} onAction={() => showWorkitems(p)} />
                                <Action.OpenInBrowser
                                    title="所有工作项"
                                    url={projectWorkitemsUrl(pid)}
                                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                                />
                                <Action
                                    title="查看迭代"
                                    icon={Icon.Calendar}
                                    shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "s" }}
                                    onAction={() => showSprints(p)}
                                />
                                <Action.OpenInBrowser
                                    title="访问迭代 Backlog"
                                    url={sprintBacklogUrl(pid)}
                                    shortcut={Keyboard.Shortcut.Common.Duplicate}
                                />
                                <Action
                                    title="查看测试计划"
                                    icon={Icon.Bug}
                                    shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "t" }}
                                    onAction={() => showTestPlans(p)}
                                />
                                <Action.OpenInBrowser
                                    title="访问测试计划"
                                    url={testPlanListUrl(pid)}
                                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                                />
                                <Action.OpenInBrowser
                                    title="概览"
                                    url={projectUrl(pid)}
                                    shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                                />
                                <Action.OpenInBrowser
                                    title="查看需求"
                                    url={projectCategoryUrl(pid, "req")}
                                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                                />
                                <Action.OpenInBrowser
                                    title="查看任务"
                                    url={projectCategoryUrl(pid, "task")}
                                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                                />
                                <Action.OpenInBrowser
                                    title="查看缺陷"
                                    url={projectCategoryUrl(pid, "bug")}
                                    shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                                />
                                <Action.OpenInBrowser
                                    title="查看主题"
                                    url={projectCategoryUrl(pid, "topic")}
                                    shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}
                                />
                                <Action.OpenInBrowser
                                    title="查看原始诉求"
                                    url={projectCategoryUrl(pid, "request")}
                                    shortcut={Keyboard.Shortcut.Common.OpenWith}
                                />
                                <Action.CopyToClipboard title="复制项目 ID" content={pid} />
                                <Action.OpenInBrowser title="在云效中打开" url={projectUrl(pid)} />
                            </ActionPanel>
                        }
                    />
                );
            })}
        </List>
    );
}

/* ---------- Sprint sub-view ---------- */

interface SprintsViewProps {
    projectId: string;
    projectName: string;
}

function SprintsView({ projectId, projectName }: SprintsViewProps) {
    const [sprints, setSprints] = useState<Sprint[] | null>(null);
    const [error, setError] = useState<string | undefined>();
    const [errorDetails, setErrorDetails] = useState<string | undefined>();

    async function load() {
        setSprints(null);
        setError(undefined);
        setErrorDetails(undefined);
        try {
            const items = await searchSprints({ projectId, status: ["TODO", "DOING"] });
            setSprints(items);
            if (items.length === 0) setError("该项目下暂无迭代。");
        } catch (err) {
            const { brief, details } = toErrorDetails(err);
            setError(brief);
            setErrorDetails(details);
            await showToast({ style: Toast.Style.Failure, title: "加载迭代失败", message: brief });
        }
    }

    useEffect(() => {
        void load();
    }, [projectId]);

    const items = sprints ?? [];
    return (
        <List isLoading={sprints === null && !error} searchBarPlaceholder={`在 ${projectName} 的迭代中筛选…`}>
            <List.EmptyView
                icon={error ? Icon.ExclamationMark : Icon.Calendar}
                title={error ? "无法加载迭代" : "暂无迭代"}
                description={error ?? "在云效中手动创建迭代后回来查看。"}
                actions={
                    error ? (
                        <ActionPanel>
                            <Action title="重新加载" onAction={() => void load()} />
                            {errorDetails ? (
                                <Action.CopyToClipboard title="复制错误详情" content={errorDetails} />
                            ) : null}
                        </ActionPanel>
                    ) : undefined
                }
            />
            <List.Section title={`迭代 / ${projectName}`}>
                {items.map((s) => {
                    const range =
                        s.startDate && s.endDate ? `${formatDateYMD(s.startDate)} → ${formatDateYMD(s.endDate)}` : "-";
                    const ownerNames = s.owners
                        ?.map((owner) => owner.name ?? owner.id)
                        .filter((value): value is string => Boolean(value))
                        .join("、");
                    return (
                        <List.Item
                            key={s.id}
                            icon={Icon.Calendar}
                            title={s.name ?? "(未命名迭代)"}
                            subtitle={s.id}
                            accessories={[
                                { tag: s.status ?? "-" },
                                { text: range },
                                ...(ownerNames ? [{ tag: ownerNames }] : []),
                            ]}
                            actions={
                                <ActionPanel>
                                    <Action.OpenInBrowser title="访问该迭代" url={sprintUrl(projectId, s.id)} />
                                    <Action.CopyToClipboard title="复制迭代 ID" content={s.id} />
                                </ActionPanel>
                            }
                        />
                    );
                })}
            </List.Section>
        </List>
    );
}

/* ---------- TestPlan sub-view ---------- */

interface TestPlansViewProps {
    projectId: string;
    projectName: string;
}

function TestPlansView({ projectId, projectName }: TestPlansViewProps) {
    const [plans, setPlans] = useState<TestPlan[] | null>(null);
    const [error, setError] = useState<string | undefined>();
    const [errorDetails, setErrorDetails] = useState<string | undefined>();

    async function load() {
        setPlans(null);
        setError(undefined);
        setErrorDetails(undefined);
        try {
            const items = await listTestPlans({ projectId });
            setPlans(items);
            if (items.length === 0) setError("该项目下暂无测试计划。");
        } catch (err) {
            const { brief, details } = toErrorDetails(err);
            setError(brief);
            setErrorDetails(details);
            await showToast({ style: Toast.Style.Failure, title: "加载测试计划失败", message: brief });
        }
    }

    useEffect(() => {
        void load();
    }, [projectId]);

    const items = plans ?? [];
    return (
        <List isLoading={plans === null && !error} searchBarPlaceholder={`在 ${projectName} 的测试计划中筛选…`}>
            <List.EmptyView
                icon={error ? Icon.ExclamationMark : Icon.Bug}
                title={error ? "无法加载测试计划" : "暂无测试计划"}
                description={error ?? "在 Testhub 创建测试计划后回来查看。"}
                actions={
                    error ? (
                        <ActionPanel>
                            <Action title="重新加载" onAction={() => void load()} />
                            {errorDetails ? (
                                <Action.CopyToClipboard title="复制错误详情" content={errorDetails} />
                            ) : null}
                        </ActionPanel>
                    ) : undefined
                }
            />
            <List.Section title={`测试计划 / ${projectName}`}>
                {items.map((p) => (
                    <List.Item
                        key={p.id}
                        icon={Icon.Bug}
                        title={p.name ?? "(未命名计划)"}
                        subtitle={p.id}
                        accessories={[{ tag: p.status ?? "-" }]}
                        actions={
                            <ActionPanel>
                                <Action.OpenInBrowser title="访问该测试计划" url={testPlanUrl(p.id)} />
                                <Action.CopyToClipboard title="复制计划 ID" content={p.id} />
                            </ActionPanel>
                        }
                    />
                ))}
            </List.Section>
        </List>
    );
}

/* ---------- Workitems sub-view ---------- */

interface WorkitemsViewProps {
    projectId: string;
    projectName: string;
}

function WorkitemsView({ projectId, projectName }: WorkitemsViewProps) {
    const [category, setCategory] = useState<CategoryFilter>(ALL_CATEGORY_VALUE);
    const [items, setItems] = useState<Workitem[]>([]);
    const [searchText, setSearchText] = useState("");
    const [isLoading, setLoading] = useState(true);
    const [error, setError] = useState<string | undefined>();
    const [reloadGeneration, setReloadGeneration] = useState(0);
    const requestGeneration = useRef(0);

    useEffect(() => {
        const generation = ++requestGeneration.current;
        const controller = new AbortController();
        setLoading(true);
        setError(undefined);

        void (async () => {
            try {
                const result = await listWorkitems({
                    projectId,
                    category,
                    page: 1,
                    perPage: 200,
                    signal: controller.signal,
                });
                if (generation === requestGeneration.current) setItems(result.items);
            } catch (err) {
                if (controller.signal.aborted || generation !== requestGeneration.current) return;
                const message = err instanceof Error ? err.message : String(err);
                setError(message);
                await showToast({ style: Toast.Style.Failure, title: "加载失败", message });
            } finally {
                if (generation === requestGeneration.current) setLoading(false);
            }
        })();

        return () => controller.abort();
    }, [projectId, category, reloadGeneration]);

    const normalizedSearch = searchText.trim().toLocaleLowerCase();
    const filteredItems = useMemo(() => {
        if (!normalizedSearch) return items;
        return items.filter((item) =>
            [
                item.subject,
                item.identifier,
                item.category,
                categoryLabel(item.category),
                item.assignee?.name,
                item.status?.name,
            ]
                .filter((value): value is string => Boolean(value))
                .some((value) => value.toLocaleLowerCase().includes(normalizedSearch)),
        );
    }, [items, normalizedSearch]);
    const titleSuffix = category === ALL_CATEGORY_VALUE ? "全部" : categoryLabel(category);

    return (
        <List
            isLoading={isLoading}
            filtering={false}
            onSearchTextChange={setSearchText}
            searchBarPlaceholder={`搜索 ${projectName} · ${titleSuffix} 的工作项…`}
            searchBarAccessory={
                <List.Dropdown
                    tooltip="工作项类别"
                    value={category}
                    onChange={(value) => setCategory(normalizeCategory(value))}
                >
                    {CATEGORY_OPTIONS.map((option) => (
                        <List.Dropdown.Item key={option.value} value={option.value} title={option.title} />
                    ))}
                </List.Dropdown>
            }
        >
            <List.EmptyView
                icon={error ? Icon.ExclamationMark : Icon.MagnifyingGlass}
                title={error ? "无法加载工作项" : items.length === 0 ? "暂无活动工作项" : "没有匹配项"}
                description={error ?? (items.length === 0 ? "分配后再试一次。" : "尝试其他搜索关键词。")}
                actions={
                    error ? (
                        <ActionPanel>
                            <Action title="重新加载" onAction={() => setReloadGeneration((value) => value + 1)} />
                        </ActionPanel>
                    ) : undefined
                }
            />
            <List.Section title={`${projectName} · ${titleSuffix}`}>
                {filteredItems.map((workitem) => {
                    const browserUrl = workitemUrl(projectId, workitem.categoryId, workitem.id);
                    return (
                        <List.Item
                            key={workitem.id}
                            icon={iconForCategory(workitem.category)}
                            title={workitem.subject ?? "(无标题)"}
                            subtitle={workitem.serialNumber}
                            accessories={[
                                {
                                    tag: {
                                        value: workitem.category ? categoryLabel(workitem.category) : "-",
                                        color: undefined,
                                    },
                                },
                                { text: workitem.assignee?.name ?? "未指派" },
                                { tag: { value: workitem.status?.name ?? "-", color: undefined } },
                            ]}
                            actions={
                                <ActionPanel>
                                    {browserUrl ? <Action.OpenInBrowser title="在云效中打开" url={browserUrl} /> : null}
                                </ActionPanel>
                            }
                        />
                    );
                })}
            </List.Section>
        </List>
    );
}

function iconForCategory(category: WorkitemCategory | string | undefined): Icon {
    switch (category) {
        case "Bug":
            return Icon.Bug;
        case "Task":
            return Icon.Checkmark;
        case "Req":
            return Icon.Document;
        case "Risk":
            return Icon.ExclamationMark;
        case "Request":
            return Icon.Envelope;
        case "Topic":
            return Icon.Tag;
        default:
            return Icon.Circle;
    }
}

/* ---------- Workitem detail (inline) ---------- */

/* (removed in this revision: workitem detail was previously exposed via a
   separate command file, then attempted as an in-command `Detail` view via
   `push(<WorkitemDetailView ...>)`. Neither surface is reachable from the
   workitem list today, so the dead component has been removed to keep the
   command lean. Reintroduce when a click target is wired up.) */
