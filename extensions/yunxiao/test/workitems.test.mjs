import test from "node:test";
import assert from "node:assert/strict";

import { normalizeWorkitems } from "../src/api/workitems-normalize.ts";
import { workitemUrl } from "../src/utils/urls.ts";

test("normalizeWorkitems maps the response field categoryId onto category", () => {
    // 回归：SearchWorkitems 的请求参数叫 category，响应字段却叫 categoryId。
    // 只读 category 会恒为 undefined，workitemUrl 拼不出详情地址，回车无反应。
    const [item] = normalizeWorkitems([
        { id: "42", subject: "OSS 图片失效的过期策略", serialNumber: "CAIJI-42", categoryId: "Bug" },
    ]);

    assert.equal(item.category, "Bug");
    assert.equal(workitemUrl("proj-1", item.category, item.id), "https://devops.aliyun.com/projex/project/proj-1/bug/42");
});

test("normalizeWorkitems maps every official category value", () => {
    for (const value of ["Req", "Bug", "Task", "Risk", "Request", "Topic"]) {
        const [item] = normalizeWorkitems([{ id: "1", categoryId: value }]);
        assert.equal(item.category, value);
        assert.ok(workitemUrl("p", item.category, item.id), `${value} 应当能拼出 URL`);
    }
});

test("normalizeWorkitems prefers an existing category over categoryId", () => {
    const [item] = normalizeWorkitems([{ id: "1", category: "Task", categoryId: "Bug" }]);
    assert.equal(item.category, "Task");
});

test("normalizeWorkitems rejects category values outside the official enum", () => {
    // 脏数据不能直接拼进 URL 路径。
    const [item] = normalizeWorkitems([{ id: "1", categoryId: "../../evil" }]);
    assert.equal(item.category, undefined);
    assert.equal(workitemUrl("p", item.category, item.id), undefined);
});

test("normalizeWorkitems preserves the other workitem fields", () => {
    const [item] = normalizeWorkitems([
        {
            id: "42",
            subject: "游戏库 / Oss 图片失效的过期策略",
            serialNumber: "CAIJI-42",
            categoryId: "Bug",
            status: { name: "待处理" },
            assignee: null,
        },
    ]);

    assert.equal(item.subject, "游戏库 / Oss 图片失效的过期策略");
    assert.equal(item.serialNumber, "CAIJI-42");
    assert.equal(item.status.name, "待处理");
    assert.equal(item.assignee, null);
});

test("normalizeWorkitems accepts { result } and { data } envelopes", () => {
    assert.equal(normalizeWorkitems({ result: [{ id: "1", categoryId: "Req" }] })[0].category, "Req");
    assert.equal(normalizeWorkitems({ data: [{ id: "2", categoryId: "Task" }] })[0].category, "Task");
});

test("normalizeWorkitems skips non-object rows and rows without an id", () => {
    assert.deepEqual(normalizeWorkitems([null, "x", 7, {}, { subject: "无 id" }]), []);
    assert.deepEqual(normalizeWorkitems(undefined), []);
    assert.deepEqual(normalizeWorkitems("nonsense"), []);
});

test("normalizeWorkitems coerces numeric ids to strings", () => {
    const [item] = normalizeWorkitems([{ id: 42, categoryId: "Bug" }]);
    assert.equal(item.id, "42");
});
