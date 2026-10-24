import test from "node:test";
import assert from "node:assert/strict";

import { categoryLabel, formatDateYMD } from "../src/utils/format.ts";

/** 按本地时区拼出期望的 YYYY-MM-DD，避免断言依赖运行环境的时区。 */
function localYMD(ms) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

test("formatDateYMD renders numeric epoch-millisecond timestamps as YYYY-MM-DD", () => {
    // 回归：testPlan/list 的起止时间是数字时间戳，normalize 层 String() 后变成纯数字串，
    // 直接 new Date("1788105600000") 是 Invalid Date，会把原始数字漏到界面上。
    assert.match(formatDateYMD("1788105600000"), /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(formatDateYMD("1788105600000"), localYMD(1788105600000));
    assert.equal(formatDateYMD("1788105600000"), formatDateYMD(1788105600000));
});

test("formatDateYMD agrees between number and numeric-string forms", () => {
    for (const ms of [1788105600000, 1824912000000, 1787500800000, 1786982400000, 1785859200000]) {
        assert.equal(formatDateYMD(String(ms)), formatDateYMD(ms));
        assert.match(formatDateYMD(String(ms)), /^\d{4}-\d{2}-\d{2}$/);
    }
});

test("formatDateYMD treats 10-digit values as epoch seconds", () => {
    const seconds = 1788105600;
    assert.equal(formatDateYMD(String(seconds)), formatDateYMD(seconds * 1000));
});

test("formatDateYMD keeps ISO strings intact without timezone drift", () => {
    assert.equal(formatDateYMD("2024-10-05T15:30:45Z"), "2024-10-05");
    assert.equal(formatDateYMD("2024-10-05"), "2024-10-05");
});

test("formatDateYMD returns a dash for empty values", () => {
    assert.equal(formatDateYMD(undefined), "-");
    assert.equal(formatDateYMD(null), "-");
    assert.equal(formatDateYMD(""), "-");
});

test("formatDateYMD falls back to the raw value for unparseable input", () => {
    assert.equal(formatDateYMD("not-a-date"), "not-a-date");
    // 短数字不该被当成时间戳静默变成 1970 年。
    assert.equal(formatDateYMD("2024"), "2024-01-01");
});

test("categoryLabel maps known categories and falls back to the raw value", () => {
    assert.equal(categoryLabel("Req"), "需求");
    assert.equal(categoryLabel("Bug"), "缺陷");
    assert.equal(categoryLabel("Unknown"), "Unknown");
    assert.equal(categoryLabel(undefined), "-");
});
