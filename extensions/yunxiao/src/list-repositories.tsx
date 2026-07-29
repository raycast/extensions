/**
 * 代码库列表命令（list-repositories）。
 * 列出当前 organization 下可访问的代码库，支持名称 / 路径 / 命名空间本地搜索，回车可在 Codeup 浏览器中打开。
 *
 * 错误展示策略与 src/list-projects.tsx 一致：toast 只放一行短因，详情在 EmptyView + 复制错误详情 Action 里查看。
 */

import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { listRepositories, type Repository } from "./api/codeup";
import { codeupRepositoryFallbackUrl, diagnosticUrl, safeHttpsUrl } from "./utils/urls";

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

function repositoryUrl(repository: Repository): string | undefined {
    return (
        safeHttpsUrl(repository.webUrl) ?? codeupRepositoryFallbackUrl(repository.pathWithNamespace ?? repository.path)
    );
}

export default function ListRepositories() {
    const [items, setItems] = useState<Repository[] | null>(null);
    const [error, setError] = useState<string>();
    const [errorDetails, setErrorDetails] = useState<string>();
    const [search, setSearch] = useState("");

    function load() {
        setItems(null);
        setError(undefined);
        setErrorDetails(undefined);
        const controller = new AbortController();
        void listRepositories({ signal: controller.signal })
            .then((result) => {
                setItems(result);
            })
            .catch((reason) => {
                if (!controller.signal.aborted) {
                    const { brief, details } = toErrorDetails(reason);
                    setError(brief);
                    setErrorDetails(details);
                    void showToast({ style: Toast.Style.Failure, title: "加载代码库失败", message: brief });
                }
            });
        return controller;
    }

    useEffect(() => {
        const controller = load();
        return () => controller.abort();
    }, []);

    const normalized = search.trim().toLocaleLowerCase();
    const filtered = useMemo(() => {
        if (!normalized) return items ?? [];
        return (items ?? []).filter((item) =>
            [item.name, item.path, item.pathWithNamespace, item.nameWithNamespace, item.description]
                .filter((value): value is string => Boolean(value))
                .some((value) => value.toLocaleLowerCase().includes(normalized)),
        );
    }, [items, normalized]);

    return (
        <List
            isLoading={items === null && !error}
            filtering={false}
            onSearchTextChange={setSearch}
            searchBarPlaceholder="搜索代码库名称、路径或命名空间…"
        >
            <List.EmptyView
                icon={error ? Icon.ExclamationMark : Icon.Folder}
                title={error ? "无法加载代码库" : items?.length ? "没有匹配项" : "暂无代码库"}
                description={error ?? (items?.length ? "尝试其他搜索关键词。" : "当前组织没有可访问的代码库。")}
                actions={
                    error && errorDetails ? (
                        <ErrorActions details={errorDetails} onReload={() => void load()} />
                    ) : undefined
                }
            />
            <List.Section title="代码库">
                {filtered.map((repository) => {
                    const url = repositoryUrl(repository);
                    return (
                        <List.Item
                            key={repository.id}
                            icon={Icon.Folder}
                            title={repository.name || repository.path || repository.id}
                            subtitle={
                                repository.pathWithNamespace ??
                                repository.nameWithNamespace ??
                                repository.description ??
                                repository.id
                            }
                            accessories={
                                repository.lastActivityAt
                                    ? [{ text: repository.lastActivityAt.slice(0, 10) }]
                                    : undefined
                            }
                            actions={
                                <ActionPanel>
                                    {url ? <Action.OpenInBrowser title="在 Codeup 中打开" url={url} /> : null}
                                    <Action.CopyToClipboard title="复制代码库 ID" content={repository.id} />
                                    {repository.pathWithNamespace ? (
                                        <Action.CopyToClipboard
                                            title="复制代码库路径"
                                            content={repository.pathWithNamespace}
                                        />
                                    ) : null}
                                </ActionPanel>
                            }
                        />
                    );
                })}
            </List.Section>
        </List>
    );
}
