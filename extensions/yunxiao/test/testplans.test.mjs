import test from "node:test";
import assert from "node:assert/strict";

import { normalizeTestPlans } from "../src/api/testplans-normalize.ts";

test("normalizeTestPlans maps official ListTestPlan fields to canonical TestPlan", () => {
    const rows = [
        {
            gmtCreate: "2024-10-05T15:30:45Z",
            gmtStart: "2024-10-01T00:00:00Z",
            gmtEnd: "2024-10-31T23:59:59Z",
            managers: ["user-1", "user-2"],
            name: "回归测试",
            spaceIdentifier: "PROJ-1",
            status: "DOING",
            testPlanIdentifier: "tp-abc",
        },
    ];

    assert.deepEqual(normalizeTestPlans(rows), [
        {
            id: "tp-abc",
            name: "回归测试",
            status: "DOING",
            projectId: "PROJ-1",
            ownerId: "user-1",
            managerIds: ["user-1", "user-2"],
            createdAt: "2024-10-05T15:30:45Z",
            startTime: "2024-10-01T00:00:00Z",
            endTime: "2024-10-31T23:59:59Z",
        },
    ]);
});

test("normalizeTestPlans accepts { result } and { data } envelope responses", () => {
    const row = {
        gmtCreate: "",
        managers: [],
        name: "x",
        spaceIdentifier: "PROJ-2",
        testPlanIdentifier: "tp-x",
    };
    assert.deepEqual(normalizeTestPlans({ result: [row] }), normalizeTestPlans([row]));
    assert.deepEqual(normalizeTestPlans({ data: [row] }), normalizeTestPlans([row]));
});

test("normalizeTestPlans skips rows missing testPlanIdentifier", () => {
    assert.deepEqual(normalizeTestPlans([{ name: "no id", status: "TODO" }]), []);
    assert.deepEqual(normalizeTestPlans(null), []);
    assert.deepEqual(normalizeTestPlans(undefined), []);
});

test("normalizeTestPlans tolerates missing optional fields", () => {
    const rows = [{ testPlanIdentifier: "tp-only" }];
    assert.deepEqual(normalizeTestPlans(rows), [
        {
            id: "tp-only",
            name: undefined,
            status: undefined,
            projectId: undefined,
            ownerId: undefined,
            managerIds: [],
            createdAt: undefined,
            startTime: undefined,
            endTime: undefined,
        },
    ]);
});

test("normalizeTestPlans filters empty-string managers from the managerIds list", () => {
    const rows = [{ testPlanIdentifier: "tp-1", managers: ["", "user-1", null, 0] }];
    const [plan] = normalizeTestPlans(rows);
    assert.equal(plan?.ownerId, "user-1");
    assert.deepEqual(plan?.managerIds, ["user-1"]);
});

test("normalizeTestPlans skips non-object rows", () => {
    const rows = [null, undefined, 1, "string", { testPlanIdentifier: "tp-1" }];
    assert.deepEqual(normalizeTestPlans(rows), [
        {
            id: "tp-1",
            name: undefined,
            status: undefined,
            projectId: undefined,
            ownerId: undefined,
            managerIds: [],
            createdAt: undefined,
            startTime: undefined,
            endTime: undefined,
        },
    ]);
});

test("normalizeTestPlans accepts numeric identifiers as strings", () => {
    const rows = [{ testPlanIdentifier: 42, spaceIdentifier: 7 }];
    assert.deepEqual(normalizeTestPlans(rows), [
        {
            id: "42",
            name: undefined,
            status: undefined,
            projectId: "7",
            ownerId: undefined,
            managerIds: [],
            createdAt: undefined,
            startTime: undefined,
            endTime: undefined,
        },
    ]);
});

test("normalizeTestPlans falls back across startTime/startDate/start aliases", () => {
    const rows = [
        { testPlanIdentifier: "tp-1", startTime: "2024-10-02" },
        { testPlanIdentifier: "tp-2", startDate: "2024-10-03" },
        { testPlanIdentifier: "tp-3", start: "2024-10-04" },
        { testPlanIdentifier: "tp-4", gmtStart: "2024-10-05", gmtEnd: "2024-10-15" },
        { testPlanIdentifier: "tp-5" },
    ];
    const [a, b, c, d, e] = normalizeTestPlans(rows);
    assert.equal(a?.startTime, "2024-10-02");
    assert.equal(b?.startTime, "2024-10-03");
    assert.equal(c?.startTime, "2024-10-04");
    assert.equal(d?.startTime, "2024-10-05");
    assert.equal(d?.endTime, "2024-10-15");
    assert.equal(e?.startTime, undefined);
    assert.equal(e?.endTime, undefined);
});
