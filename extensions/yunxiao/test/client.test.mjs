import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

/**
 * client.ts 通过 @raycast/api 读取偏好，Node 测试环境没有该模块，
 * 这里用同步解析钩子把它重定向到本地桩实现。
 */
const PREFERENCES = {
    personalAccessToken: "secret-example-pat",
    organizationId: "org-1",
    endpointMode: "central",
};

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier === "@raycast/api") {
            return { url: new URL("./stubs/raycast-api.mjs", import.meta.url).href, shortCircuit: true };
        }
        // 注册 resolve 钩子会绕过 Node 对 TS 源码里无扩展名导入的内置补全，这里手动补 .ts。
        if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier)) {
            try {
                return nextResolve(`${specifier}.ts`, context);
            } catch {
                // 落回原始 specifier，交给默认解析报错。
            }
        }
        return nextResolve(specifier, context);
    },
});

const { setPreferences } = await import("./stubs/raycast-api.mjs");
setPreferences(PREFERENCES);

const { request } = await import("../src/api/client.ts");

/** 捕获一次 fetch 调用的 init，并返回固定的成功响应。 */
async function captureRequest(path, options) {
    const originalFetch = globalThis.fetch;
    let captured;
    globalThis.fetch = async (url, init) => {
        captured = { url, init };
        return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
    };
    try {
        await request(path, options);
    } finally {
        globalThis.fetch = originalFetch;
    }
    return captured;
}

function headerOf(init, name) {
    return init.headers[name];
}

test("bodyless POST still declares JSON content type and sends an empty object body", async () => {
    // 回归：缺省 Content-Type 会被网关推断成 application/x-www-form-urlencoded，
    // testPlan/list 因此返回 500 "Content type ... not supported"。
    const { init } = await captureRequest("/oapi/v1/projex/testPlan/list", {
        method: "POST",
        query: { page: 1, perPage: 200 },
    });

    assert.equal(init.method, "POST");
    assert.equal(headerOf(init, "Content-Type"), "application/json");
    assert.equal(init.body, "{}");
});

test("POST with a body serializes it as JSON", async () => {
    const { init } = await captureRequest("/oapi/v1/projex/projects", {
        method: "POST",
        body: { status: "DOING" },
    });

    assert.equal(headerOf(init, "Content-Type"), "application/json");
    assert.equal(init.body, JSON.stringify({ status: "DOING" }));
});

test("GET sends no body and no content type", async () => {
    const { init } = await captureRequest("/oapi/v1/projex/projects", { query: { page: 1 } });

    assert.equal(init.method, "GET");
    assert.equal(headerOf(init, "Content-Type"), undefined);
    assert.equal(init.body, undefined);
});

test("query parameters are appended and url-encoded", async () => {
    const { url } = await captureRequest("/oapi/v1/projex/testPlan/list", {
        method: "POST",
        query: { status: "DOING,DONE", name: "回归 测试", empty: "", missing: undefined, page: 2 },
    });

    // 空串与 undefined 的参数被剔除，其余按 encodeURIComponent 编码。
    assert.equal(
        url,
        "https://openapi-rdc.aliyuncs.com/oapi/v1/projex/testPlan/list" +
            "?status=DOING%2CDONE&name=%E5%9B%9E%E5%BD%92%20%E6%B5%8B%E8%AF%95&page=2",
    );
});
