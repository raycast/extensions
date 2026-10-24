import test from "node:test";
import assert from "node:assert/strict";

import { normalizeMergeRequests, normalizeRepositories } from "../src/api/codeup-normalize.ts";

test("normalizeRepositories handles bare-array and envelope responses", () => {
    const row = {
        id: "42",
        name: "demo",
        path: "org/demo",
        pathWithNamespace: "org/demo",
        webUrl: "https://codeup.aliyun.com/org/demo",
        archived: false,
        lastActivityAt: "2024-10-05T15:30:45Z",
    };

    assert.deepEqual(normalizeRepositories([row]), [
        {
            id: "42",
            name: "demo",
            path: "org/demo",
            pathWithNamespace: "org/demo",
            nameWithNamespace: undefined,
            description: undefined,
            webUrl: "https://codeup.aliyun.com/org/demo",
            archived: false,
            lastActivityAt: "2024-10-05T15:30:45Z",
            accessLevel: undefined,
        },
    ]);

    assert.deepEqual(normalizeRepositories({ result: [row] }), normalizeRepositories([row]));
    assert.deepEqual(normalizeRepositories({ data: [row] }), normalizeRepositories([row]));
});

test("normalizeRepositories skips rows without an id", () => {
    assert.deepEqual(normalizeRepositories([{ name: "no id" }]), []);
    assert.deepEqual(normalizeRepositories(null), []);
});

test("normalizeMergeRequests extracts localId from official docs response", () => {
    const sample = [
        {
            author: {
                avatar: "https://example.com/avatar.png",
                email: "user@example.com",
                name: "codeup-name",
                state: "active",
                userId: "62c795xxxb468af8",
                username: "codeup-username",
            },
            createdAt: "2024-10-05T15:30:45Z",
            detailUrl: "https://codeup.aliyun.com/example_org/example_demo/change/1",
            localId: 1,
            projectId: 2813489,
            sourceBranch: "demo-branch",
            state: "UNDER_REVIEW",
            targetBranch: "master",
            title: "mr title",
            updatedAt: "2024-10-05T15:30:45Z",
            webUrl: "https://codeup.aliyun.com/example_org/example_demo/change/1",
        },
    ];

    assert.deepEqual(normalizeMergeRequests(sample), [
        {
            id: "1",
            localId: 1,
            projectId: 2813489,
            repositoryPath: undefined,
            title: "mr title",
            state: "UNDER_REVIEW",
            sourceBranch: "demo-branch",
            targetBranch: "master",
            createdAt: "2024-10-05T15:30:45Z",
            updatedAt: "2024-10-05T15:30:45Z",
            webUrl: "https://codeup.aliyun.com/example_org/example_demo/change/1",
            detailUrl: "https://codeup.aliyun.com/example_org/example_demo/change/1",
            author: {
                name: "codeup-name",
                username: "codeup-username",
                userId: "62c795xxxb468af8",
            },
        },
    ]);
});

test("normalizeMergeRequests captures repository.pathWithNamespace as the canonical URL namespace", () => {
    const row = {
        localId: 160,
        projectId: 42,
        title: "feat: nested namespace",
        repository: { pathWithNamespace: "qyd/kjs/kjs4j/kjs-game" },
    };
    const [mr] = normalizeMergeRequests([row]);
    assert.equal(mr?.repositoryPath, "qyd/kjs/kjs4j/kjs-game");
    assert.equal(mr?.localId, 160);
});

test("normalizeMergeRequests handles envelope and skips rows missing localId", () => {
    const row = { localId: 7, title: "ok", projectId: 42 };
    assert.deepEqual(normalizeMergeRequests({ result: [row] }), [
        {
            id: "7",
            localId: 7,
            projectId: 42,
            repositoryPath: undefined,
            title: "ok",
            state: undefined,
            sourceBranch: undefined,
            targetBranch: undefined,
            createdAt: undefined,
            updatedAt: undefined,
            webUrl: undefined,
            detailUrl: undefined,
            author: undefined,
        },
    ]);
    assert.deepEqual(normalizeMergeRequests([{ title: "no localId" }]), []);
    assert.deepEqual(normalizeMergeRequests([]), []);
});
