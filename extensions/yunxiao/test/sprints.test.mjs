import test from "node:test";
import assert from "node:assert/strict";

import { normalizeSprints } from "../src/api/sprints-normalize.ts";

test("normalizeSprints maps official ListSprints fields to canonical Sprint", () => {
    const sample = [
        {
            id: "1111",
            name: "sprint-test",
            status: "DOING",
            startDate: "2025-01-01T00:00:00Z",
            endDate: "2025-01-14T23:59:59Z",
            capacityHours: 100,
            description: "iteration for auth refactor",
            gmtCreate: "2024-12-15T10:00:00Z",
            gmtModified: "2025-01-02T03:14:00Z",
            locked: false,
            creator: { id: "creator-1", name: "alice" },
            modifier: { id: "modifier-1", name: "bob" },
            owners: [
                { id: "owner-1", name: "carol" },
                { id: "owner-2", name: "dave" },
            ],
        },
    ];

    assert.deepEqual(normalizeSprints(sample), [
        {
            id: "1111",
            name: "sprint-test",
            status: "DOING",
            startDate: "2025-01-01T00:00:00Z",
            endDate: "2025-01-14T23:59:59Z",
            capacityHours: 100,
            description: "iteration for auth refactor",
            createdAt: "2024-12-15T10:00:00Z",
            updatedAt: "2025-01-02T03:14:00Z",
            locked: false,
            creator: { id: "creator-1", name: "alice" },
            modifier: { id: "modifier-1", name: "bob" },
            owners: [
                { id: "owner-1", name: "carol" },
                { id: "owner-2", name: "dave" },
            ],
        },
    ]);
});

test("normalizeSprints accepts { result } and { data } envelope responses", () => {
    const row = { id: "1", name: "envelope" };
    assert.deepEqual(normalizeSprints({ result: [row] }), [
        {
            id: "1",
            name: "envelope",
            status: undefined,
            startDate: undefined,
            endDate: undefined,
            capacityHours: undefined,
            description: undefined,
            createdAt: undefined,
            updatedAt: undefined,
            locked: undefined,
            creator: undefined,
            modifier: undefined,
            owners: undefined,
        },
    ]);
    assert.deepEqual(normalizeSprints({ data: [row] }), normalizeSprints({ result: [row] }));
});

test("normalizeSprints skips rows missing id", () => {
    assert.deepEqual(normalizeSprints([{ name: "no id" }]), []);
    assert.deepEqual(normalizeSprints(null), []);
    assert.deepEqual(normalizeSprints({ result: [{ title: "still no id" }] }), []);
});

test("normalizeSprints tolerates missing optional fields", () => {
    const [sprint] = normalizeSprints([{ id: "42" }]);
    assert.equal(sprint.id, "42");
    assert.equal(sprint.name, undefined);
    assert.equal(sprint.status, undefined);
    assert.equal(sprint.locked, undefined);
    assert.equal(sprint.owners, undefined);
    assert.equal(sprint.creator, undefined);
});

test("normalizeSprints parses numeric capacityHours from string", () => {
    const [sprint] = normalizeSprints([{ id: "1", capacityHours: "120" }]);
    assert.equal(sprint.capacityHours, 120);
});

test("normalizeSprints interprets 'true'/'false' strings as locked", () => {
    const [locked] = normalizeSprints([{ id: "1", locked: "true" }]);
    const [unlocked] = normalizeSprints([{ id: "2", locked: "false" }]);
    assert.equal(locked.locked, true);
    assert.equal(unlocked.locked, false);
});

test("normalizeSprints drops owners entries with no id and no name", () => {
    const [sprint] = normalizeSprints([{ id: "1", owners: [{ id: "x" }, { name: "y" }, {}, { id: "z", name: "zz" }] }]);
    // 约定保留 undefined 键（与 normalizeMergeRequests / normalizeTestPlans 一致），
    // 但完全空的对象 { id: undefined, name: undefined } 不会出现在 owners 列表里。
    assert.deepEqual(sprint.owners, [
        { id: "x", name: undefined },
        { id: undefined, name: "y" },
        { id: "z", name: "zz" },
    ]);
});
