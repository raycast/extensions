export interface Repository {
    id: string;
    name?: string;
    path?: string;
    pathWithNamespace?: string;
    nameWithNamespace?: string;
    description?: string;
    webUrl?: string;
    archived?: boolean;
    lastActivityAt?: string;
    accessLevel?: number;
}

export interface MergeRequest {
    id: string;
    localId?: number;
    projectId?: number;
    /** 仓库命名空间路径，例如 `qyd/kjs/kjs4j/kjs-game`；用于构造 fallback URL */
    repositoryPath?: string;
    title?: string;
    state?: string;
    sourceBranch?: string;
    targetBranch?: string;
    createdAt?: string;
    updatedAt?: string;
    webUrl?: string;
    detailUrl?: string;
    author?: { name?: string; username?: string; userId?: string };
}

function responseRows(response: unknown): unknown[] {
    if (Array.isArray(response)) return response;
    if (!response || typeof response !== "object") return [];
    const value = response as { result?: unknown[]; data?: unknown[] };
    return value.result ?? value.data ?? [];
}

function stringValue(value: unknown): string | undefined {
    return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function numberValue(value: unknown): number | undefined {
    return typeof value === "number"
        ? value
        : typeof value === "string" && /^\d+$/.test(value)
          ? Number(value)
          : undefined;
}

export function normalizeRepositories(response: unknown): Repository[] {
    const rows = responseRows(response);
    return rows.flatMap((row) => {
        if (!row || typeof row !== "object") return [];
        const value = row as Record<string, unknown>;
        const id = stringValue(value.id ?? value.Id);
        if (!id) return [];
        return [
            {
                id,
                name: stringValue(value.name),
                path: stringValue(value.path),
                pathWithNamespace: stringValue(value.pathWithNamespace),
                nameWithNamespace: stringValue(value.nameWithNamespace),
                description: stringValue(value.description),
                webUrl: stringValue(value.webUrl),
                archived: Boolean(value.archived ?? value.archive),
                lastActivityAt: stringValue(value.lastActivityAt),
                accessLevel: typeof value.accessLevel === "number" ? value.accessLevel : undefined,
            },
        ];
    });
}

export function normalizeMergeRequests(response: unknown): MergeRequest[] {
    const rows = responseRows(response);
    return rows.flatMap((row) => {
        if (!row || typeof row !== "object") return [];
        const value = row as Record<string, unknown>;
        const localId = numberValue(value.localId);
        if (localId === undefined) return [];
        const author =
            value.author && typeof value.author === "object" ? (value.author as Record<string, unknown>) : undefined;
        const repository =
            value.repository && typeof value.repository === "object"
                ? (value.repository as Record<string, unknown>)
                : undefined;
        return [
            {
                id: String(localId),
                localId,
                projectId: numberValue(value.projectId),
                repositoryPath: repository ? stringValue(repository.pathWithNamespace) : undefined,
                title: stringValue(value.title),
                state: stringValue(value.state),
                sourceBranch: stringValue(value.sourceBranch),
                targetBranch: stringValue(value.targetBranch),
                createdAt: stringValue(value.createdAt),
                updatedAt: stringValue(value.updatedAt),
                webUrl: stringValue(value.webUrl),
                detailUrl: stringValue(value.detailUrl),
                author: author
                    ? {
                          name: stringValue(author.name),
                          username: stringValue(author.username),
                          userId: stringValue(author.userId),
                      }
                    : undefined,
            },
        ];
    });
}
