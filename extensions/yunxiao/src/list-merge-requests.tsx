/**
 * 合并请求列表命令（list-merge-requests）。
 * 列出当前 organization 下的合并请求；搜索栏右侧带状态下拉，可按开启 / 已合并 / 已关闭 筛选，默认 opened。
 * 切换状态会立即重新拉取（与官方 ListChangeRequests 的 state 参数对应）。
 */

import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { listOpenMergeRequests, type MergeRequest, type MergeRequestStateFilter } from "./api/codeup";
import { codeupMergeRequestFallbackUrl, diagnosticUrl, safeHttpsUrl } from "./utils/urls";

interface ErrorDetails {
    /** 一行短原因，给 toast 和 EmptyView 用 */
    brief: string;
    /** 完整诊断信息（URL、状态码、响应体），给复制用 */
    details: string;
}

function toErrorDetails(err: unknown): ErrorDetails {
    const msg = err instanceof Error ? err.message : String(err);
    const anyErr = err as { status?: number; bodyText?: string; name?: string; url?: string; method?: string };
    const status = anyErr?.status;
    const body = anyErr?.bodyText ?? "";
    const url = anyErr?.url;
    const method = anyErr?.method ?? "GET";
    const firstLine = msg.split("\n")[0] || "未知错误";
    const brief = typeof status === "number" && status > 0 ? `${status} · ${firstLine}` : firstLine;
    const lines: string[] = [];
    lines.push(`时间: ${new Date().toISOString()}`);
    lines.push(`request: ${method} ${diagnosticUrl(url)}`);
    if (typeof status === "number") lines.push(`status: ${status}`);
    lines.push(`name: ${anyErr?.name ?? "Error"}`);
    lines.push(`message: ${msg}`);
    if (body) {
        lines.push(`response body:`);
        lines.push(body.length > 4000 ? body.slice(0, 4000) + "\n…(已截断)" : body);
    }
    lines.push("");
    lines.push("排查建议:");
    lines.push("1. 偏好里 Personal Access Token 是否勾选了 Codeup / 代码库读取权限？");
    lines.push("2. Organization Id 是否与浏览器登录后 URL 中的一致？");
    lines.push("3. 接入点模式是否选对：默认中心版（openapi-rdc.aliyuncs.com），Region 版需要填自部署 URL；");
    lines.push("   Region 版请求 path 不带 organizations/{organizationId}/ 段。");
    lines.push("4. 把上面的 request 行复制到终端，用 curl 加 x-yunxiao-token 头直连，看返回。");
    return { brief, details: lines.join("\n") };
}

interface ErrorActionsProps {
    details: string;
    onReload: () => void;
}

function ErrorActions({ details, onReload }: ErrorActionsProps) {
    return (
        <ActionPanel>
            <Action title="重新加载" icon={Icon.ArrowClockwise} onAction={onReload} />
            <Action.CopyToClipboard
                title="复制错误详情"
                content={details}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
        </ActionPanel>
    );
}

function mergeRequestUrl(request: MergeRequest): string | undefined {
    // 优先级：API 直接给的 webUrl / detailUrl（可能带 PR 的 sourceBranch 锚点），
    // 退路：用 repositoryPath + localId 拼出
    //   https://codeup.aliyun.com/{namespace}/{repo}/change/{localId}
    // 这也是浏览器里合并请求详情页的 canonical URL。
    return safeHttpsUrl(request.detailUrl) ?? codeupMergeRequestFallbackUrl(request.repositoryPath, request.localId);
}

const MR_STATE_OPTIONS: { value: MergeRequestStateFilter; title: string; label: string; empty: string }[] = [
    { value: "opened", title: "开启", label: "开启的", empty: "当前没有处于开启状态的合并请求。" },
    { value: "merged", title: "已合并", label: "已合并的", empty: "当前没有已合并的合并请求。" },
    { value: "closed", title: "已关闭", label: "已关闭的", empty: "当前没有已关闭的合并请求。" },
];

function findMrStateOption(state: string): (typeof MR_STATE_OPTIONS)[number] {
    return MR_STATE_OPTIONS.find((option) => option.value === state) ?? MR_STATE_OPTIONS[0];
}

export default function ListMergeRequests() {
    const [items, setItems] = useState<MergeRequest[] | null>(null);
    const [error, setError] = useState<string>();
    const [errorDetails, setErrorDetails] = useState<string>();
    const [search, setSearch] = useState("");
    const [stateFilter, setStateFilter] = useState<MergeRequestStateFilter>("opened");

    function load(state: MergeRequestStateFilter) {
        setItems(null);
        setError(undefined);
        setErrorDetails(undefined);
        const controller = new AbortController();
        void listOpenMergeRequests({ signal: controller.signal, state })
            .then((result) => {
                setItems(result);
            })
            .catch((reason) => {
                if (!controller.signal.aborted) {
                    const { brief, details } = toErrorDetails(reason);
                    setError(brief);
                    setErrorDetails(details);
                    void showToast({ style: Toast.Style.Failure, title: "加载合并请求失败", message: brief });
                }
            });
        return controller;
    }

    useEffect(() => {
        const controller = load(stateFilter);
        return () => controller.abort();
    }, [stateFilter]);

    const normalized = search.trim().toLocaleLowerCase();
    const filtered = useMemo(() => {
        if (!normalized) return items ?? [];
        return (items ?? []).filter((item) =>
            [
                item.title,
                item.localId !== undefined ? String(item.localId) : undefined,
                item.state,
                item.sourceBranch,
                item.targetBranch,
                item.author?.name,
                item.author?.username,
                item.projectId !== undefined ? String(item.projectId) : undefined,
            ]
                .filter((value): value is string => Boolean(value))
                .some((value) => value.toLocaleLowerCase().includes(normalized)),
        );
    }, [items, normalized]);

    const stateOption = findMrStateOption(stateFilter);

    return (
        <List
            isLoading={items === null && !error}
            filtering={false}
            onSearchTextChange={setSearch}
            searchBarPlaceholder={`搜索${stateOption.label}合并请求标题、仓库、分支或作者…`}
            searchBarAccessory={
                <List.Dropdown
                    tooltip="合并请求状态"
                    value={stateFilter}
                    onChange={(value) => setStateFilter(value as MergeRequestStateFilter)}
                >
                    {MR_STATE_OPTIONS.map((option) => (
                        <List.Dropdown.Item key={option.value} value={option.value} title={option.title} />
                    ))}
                </List.Dropdown>
            }
        >
            <List.EmptyView
                icon={error ? Icon.ExclamationMark : Icon.Link}
                title={error ? "无法加载合并请求" : items?.length ? "没有匹配项" : `暂无${stateOption.label}合并请求`}
                description={error ?? (items?.length ? "尝试其他搜索关键词。" : stateOption.empty)}
                actions={
                    error && errorDetails ? (
                        <ErrorActions details={errorDetails} onReload={() => void load(stateFilter)} />
                    ) : undefined
                }
            />
            <List.Section title={stateOption.label === "开启的" ? "开启的合并请求" : `${stateOption.label}合并请求`}>
                {filtered.map((request, index) => {
                    const url = mergeRequestUrl(request);
                    // 项目 id + 合并请求本地 id 是天然唯一键；缺失时回落到下标。
                    const namespace = request.projectId !== undefined ? String(request.projectId) : `row-${index}`;
                    const key = `${namespace}-${request.localId ?? request.id}`;
                    return (
                        <List.Item
                            key={key}
                            icon={Icon.Link}
                            title={request.title || `合并请求 !${request.localId ?? request.id}`}
                            subtitle={
                                request.projectId !== undefined
                                    ? `项目 #${request.projectId}`
                                    : (request.state ?? request.id)
                            }
                            accessories={[
                                { text: `${request.sourceBranch ?? "?"} → ${request.targetBranch ?? "?"}` },
                                { tag: request.author?.name ?? request.author?.username ?? "未知作者" },
                            ]}
                            actions={
                                <ActionPanel>
                                    {url ? <Action.OpenInBrowser title="访问合并请求" url={url} /> : null}
                                    <Action.CopyToClipboard
                                        title="复制合并请求 ID"
                                        content={request.localId !== undefined ? String(request.localId) : request.id}
                                    />
                                </ActionPanel>
                            }
                        />
                    );
                })}
            </List.Section>
        </List>
    );
}
