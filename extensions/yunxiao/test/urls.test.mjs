import test from "node:test";
import assert from "node:assert/strict";

import {
    codeupChangesUrl,
    codeupGroupsUrl,
    codeupMergeRequestFallbackUrl,
    codeupMineUrl,
    codeupRepositoryFallbackUrl,
    diagnosticUrl,
    organizationAdminUrl,
    projectCategoryUrl,
    projectUrl,
    projectWorkitemsUrl,
    safeHttpsUrl,
    sprintBacklogUrl,
    sprintUrl,
    testPlanListUrl,
    testPlanUrl,
    workitemUrl,
} from "../src/utils/urls.ts";

const WORKITEM_TYPES = {
    Req: "req",
    Bug: "bug",
    Task: "task",
    Risk: "risk",
    Request: "request",
    Topic: "topic",
};

test("maps all six workitem categories to canonical typed URLs", () => {
    for (const [category, type] of Object.entries(WORKITEM_TYPES)) {
        assert.equal(
            workitemUrl("project-id", category, "workitem-id"),
            `https://devops.aliyun.com/projex/project/project-id/${type}/workitem-id`,
        );
    }
});

test("does not build workitem URLs for missing or unknown categories", () => {
    assert.equal(workitemUrl("project-id", undefined, "workitem-id"), undefined);
    assert.equal(workitemUrl("project-id", "Unknown", "workitem-id"), undefined);
    assert.equal(workitemUrl("", "Req", "workitem-id"), undefined);
    assert.equal(workitemUrl("project-id", "Req", ""), undefined);
});

test("encodes every dynamic URL path segment", () => {
    assert.equal(
        workitemUrl("project /?#", "Req", "item /?#"),
        "https://devops.aliyun.com/projex/project/project%20%2F%3F%23/req/item%20%2F%3F%23",
    );
    assert.equal(
        sprintUrl("project /", "sprint /"),
        "https://devops.aliyun.com/projex/project/project%20%2F/sprint/sprint%20%2F",
    );
    assert.equal(testPlanUrl("plan /"), "https://devops.aliyun.com/testhub/plan/plan%20%2F/dashboard");
    assert.equal(organizationAdminUrl("org /"), "https://devops.aliyun.com/org-admin/org%20%2F/members/member");
});

test("builds project, sprint, test plan, and organization URLs exactly", () => {
    assert.equal(projectUrl("p1"), "https://devops.aliyun.com/projex/project/p1");
    assert.equal(projectCategoryUrl("p1", "risk"), "https://devops.aliyun.com/projex/project/p1/risk");
    assert.equal(
        projectWorkitemsUrl("p1"),
        "https://devops.aliyun.com/projex/project/p1/workitem#viewIdentifier=b3d95a58f1270afe4d4c7ae746",
    );
    assert.equal(sprintBacklogUrl("p1"), "https://devops.aliyun.com/projex/project/p1/sprint/backlog");
    assert.equal(sprintUrl("p1", "s1"), "https://devops.aliyun.com/projex/project/p1/sprint/s1");
    assert.equal(testPlanListUrl("p1"), "https://devops.aliyun.com/projex/project/p1/testplan");
    assert.equal(testPlanUrl("tp1"), "https://devops.aliyun.com/testhub/plan/tp1/dashboard");
    assert.equal(organizationAdminUrl("org-abc"), "https://devops.aliyun.com/org-admin/org-abc/members/member");
});

test("builds Codeup quick links exactly", () => {
    assert.equal(codeupMineUrl(), "https://codeup.aliyun.com/?navKey=mine");
    assert.equal(codeupGroupsUrl(), "https://codeup.aliyun.com/groups?navKey=mine");
    assert.equal(codeupChangesUrl(), "https://codeup.aliyun.com/changes?navKey=all&search=created");
});

test("safeHttpsUrl rejects non-https schemes and embedded credentials", () => {
    assert.equal(safeHttpsUrl("javascript:alert(1)"), undefined);
    assert.equal(safeHttpsUrl("data:text/html,phish"), undefined);
    assert.equal(safeHttpsUrl("http://codeup.aliyun.com/foo"), undefined);
    assert.equal(safeHttpsUrl("https://user:pass@codeup.aliyun.com/foo"), undefined);
    assert.equal(safeHttpsUrl("not a url"), undefined);
    assert.equal(safeHttpsUrl(undefined), undefined);
    assert.equal(safeHttpsUrl(""), undefined);
});

test("safeHttpsUrl enforces an allow-list of trusted hosts", () => {
    assert.equal(safeHttpsUrl("https://codeup.aliyun.com/org/repo"), "https://codeup.aliyun.com/org/repo");
    assert.equal(safeHttpsUrl("https://evil.example/phish"), undefined);
    assert.equal(safeHttpsUrl("https://CODEUP.aliyun.com/org/repo"), "https://codeup.aliyun.com/org/repo");
    // 完全指定自定义 allow-list 时不再依赖默认值
    assert.equal(safeHttpsUrl("https://codeup.aliyun.com/x", new Set(["codeup.example.test"])), undefined);
    assert.equal(
        safeHttpsUrl("https://codeup.example.test/x", new Set(["codeup.example.test"])),
        "https://codeup.example.test/x",
    );
});

test("codeupRepositoryFallbackUrl rejects dot-segments and empty paths", () => {
    assert.equal(codeupRepositoryFallbackUrl(undefined), undefined);
    assert.equal(codeupRepositoryFallbackUrl(""), undefined);
    assert.equal(codeupRepositoryFallbackUrl("   "), undefined);
    assert.equal(codeupRepositoryFallbackUrl("../../admin"), undefined);
    assert.equal(codeupRepositoryFallbackUrl("org/."), undefined);
    assert.equal(codeupRepositoryFallbackUrl("/leading"), "https://codeup.aliyun.com/leading");
    assert.equal(codeupRepositoryFallbackUrl("org/repo"), "https://codeup.aliyun.com/org/repo");
    assert.equal(
        codeupRepositoryFallbackUrl("org with space/repo"),
        "https://codeup.aliyun.com/org%20with%20space/repo",
    );
});

test("codeupMergeRequestFallbackUrl only accepts numeric ids and clean paths", () => {
    assert.equal(codeupMergeRequestFallbackUrl(undefined, "1"), undefined);
    assert.equal(codeupMergeRequestFallbackUrl("", "1"), undefined);
    assert.equal(codeupMergeRequestFallbackUrl("org/repo", undefined), undefined);
    assert.equal(codeupMergeRequestFallbackUrl("org/repo", ""), undefined);
    assert.equal(codeupMergeRequestFallbackUrl("org/repo", "abc"), undefined);
    assert.equal(codeupMergeRequestFallbackUrl("org/../foo", "1"), undefined);
    assert.equal(codeupMergeRequestFallbackUrl("../foo", "1"), undefined);
    assert.equal(codeupMergeRequestFallbackUrl("org/repo", "42"), "https://codeup.aliyun.com/org/repo/change/42");
    assert.equal(codeupMergeRequestFallbackUrl("org/repo", 42), "https://codeup.aliyun.com/org/repo/change/42");
});

test("diagnosticUrl strips userinfo, query, and hash", () => {
    assert.equal(diagnosticUrl(undefined), "(URL unavailable)");
    assert.equal(diagnosticUrl(""), "(URL unavailable)");
    assert.equal(diagnosticUrl("not a url"), "(invalid URL)");
    assert.equal(diagnosticUrl("http://x/y"), "(URL unavailable)");
    assert.equal(diagnosticUrl("https://user:pass@example.com/path?secret=1#frag"), "https://example.com/path");
});
